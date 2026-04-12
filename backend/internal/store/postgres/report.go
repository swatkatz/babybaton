package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"math"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/swatkatz/babybaton/backend/internal/domain"
	"github.com/swatkatz/babybaton/backend/internal/parallel"
)

// Internal result types for CTE parsing

type feedData struct {
	buckets []domain.ReportBucket
	hourly  []domain.HourlyBucket
	medianFeeds float64
	medianMl    float64
	totalFeeds  int
	totalMl     int
}

type diaperData struct {
	buckets      []domain.ReportBucket
	hourly       []domain.HourlyBucket
	medianPerDay float64
	totalChanges int
	totalPoops   int
	totalPees    int
}

type sleepData struct {
	buckets             []domain.ReportBucket
	hourly              []domain.HourlyBucket
	medianMinutesPerDay float64
	medianLongestStretch float64
	totalMinutes        int
}

func (s *PostgresStore) CareReport(ctx context.Context, familyID uuid.UUID, from, to time.Time, granularity string) (*domain.CareReport, error) {
	var feedResult feedData
	var diaperResult diaperData
	var sleepResult sleepData
	var goals *domain.ScheduleGoals
	var overnightStats domain.OvernightSleepStats
	var napStats domain.NapStats

	err := parallel.Run(ctx,
		func(ctx context.Context) error {
			var err error
			feedResult, err = s.feedReport(ctx, familyID, from, to, granularity)
			return err
		},
		func(ctx context.Context) error {
			var err error
			diaperResult, err = s.diaperReport(ctx, familyID, from, to, granularity)
			return err
		},
		func(ctx context.Context) error {
			var err error
			sleepResult, err = s.sleepReport(ctx, familyID, from, to, granularity)
			return err
		},
		func(ctx context.Context) error {
			var err error
			goals, err = s.GetScheduleGoals(ctx, familyID)
			return err
		},
		func(ctx context.Context) error {
			var err error
			overnightStats, err = s.overnightSleepStats(ctx, familyID, from, to)
			return err
		},
		func(ctx context.Context) error {
			var err error
			napStats, err = s.napSleepStats(ctx, familyID, from, to)
			return err
		},
	)
	if err != nil {
		return nil, fmt.Errorf("failed to run parallel report queries: %w", err)
	}

	// Sequential: feed type breakdown
	feedTypeBreakdown, err := s.feedTypeBreakdown(ctx, familyID, from, to)
	if err != nil {
		return nil, fmt.Errorf("failed to query feed type breakdown: %w", err)
	}

	// Merge buckets from all activity types
	buckets := mergeBuckets(feedResult.buckets, diaperResult.buckets, sleepResult.buckets)

	// Merge hourly patterns
	hourly := mergeHourly(feedResult.hourly, diaperResult.hourly, sleepResult.hourly)

	// Compute goal adherence
	var goalAdherence *domain.GoalAdherence
	if goals != nil {
		goalAdherence, err = s.computeGoalAdherence(ctx, familyID, from, to, goals)
		if err != nil {
			return nil, fmt.Errorf("failed to compute goal adherence: %w", err)
		}
	}

	report := &domain.CareReport{
		From:        from,
		To:          to,
		Granularity: granularity,
		Totals: domain.ReportTotals{
			TotalFeeds:                  feedResult.totalFeeds,
			TotalMl:                     feedResult.totalMl,
			MedianFeedsPerDay:           feedResult.medianFeeds,
			MedianMlPerDay:              feedResult.medianMl,
			FeedTypeBreakdown:           feedTypeBreakdown,
			TotalDiaperChanges:          diaperResult.totalChanges,
			TotalPoops:                  diaperResult.totalPoops,
			TotalPees:                   diaperResult.totalPees,
			MedianDiapersPerDay:         diaperResult.medianPerDay,
			TotalSleepMinutes:           sleepResult.totalMinutes,
			MedianSleepMinutesPerDay:    sleepResult.medianMinutesPerDay,
			MedianLongestStretchMinutes: sleepResult.medianLongestStretch,
			OvernightStats:              overnightStats,
			NapStats:                    napStats,
		},
		Buckets:       buckets,
		HourlyPattern: hourly,
		GoalAdherence: goalAdherence,
	}

	return report, nil
}

func (s *PostgresStore) feedReport(ctx context.Context, familyID uuid.UUID, from, to time.Time, granularity string) (feedData, error) {
	pgGranularity := toPgInterval(granularity)

	query := `
WITH daily AS (
  SELECT date_trunc('day', fd.start_time) AS day,
         count(*) AS feeds,
         coalesce(sum(fd.amount_ml), 0) AS ml
  FROM activities a
  JOIN care_sessions cs ON a.care_session_id = cs.id
  JOIN feed_details fd ON fd.activity_id = a.id
  WHERE cs.family_id = $1
    AND fd.start_time >= $2 AND fd.start_time < $3
    AND a.activity_type = 'feed'
  GROUP BY day
),
buckets AS (
  SELECT date_trunc($4, day) AS bucket,
         sum(feeds)::int AS feeds,
         sum(ml)::int AS ml
  FROM daily GROUP BY bucket
),
medians AS (
  SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY feeds) AS median_feeds,
         percentile_cont(0.5) WITHIN GROUP (ORDER BY ml) AS median_ml
  FROM daily
),
hourly AS (
  SELECT extract(hour FROM fd.start_time)::int AS hour,
         count(*) AS feeds
  FROM activities a
  JOIN care_sessions cs ON a.care_session_id = cs.id
  JOIN feed_details fd ON fd.activity_id = a.id
  WHERE cs.family_id = $1
    AND fd.start_time >= $2 AND fd.start_time < $3
    AND a.activity_type = 'feed'
  GROUP BY hour
)
SELECT 'buckets' AS result_type, bucket::text AS key, feeds::text AS val1, ml::text AS val2
FROM buckets
UNION ALL
SELECT 'medians', '', median_feeds::text, median_ml::text
FROM medians
UNION ALL
SELECT 'hourly', hour::text, feeds::text, ''
FROM hourly
ORDER BY result_type, key`

	rows, err := s.db.QueryContext(ctx, query, familyID, from, to, pgGranularity)
	if err != nil {
		return feedData{}, fmt.Errorf("failed to query feed report: %w", err)
	}
	defer rows.Close()

	var result feedData
	for rows.Next() {
		var resultType, key string
		var val1, val2 sql.NullString
		if err := rows.Scan(&resultType, &key, &val1, &val2); err != nil {
			return feedData{}, fmt.Errorf("failed to scan feed report row: %w", err)
		}
		switch resultType {
		case "buckets":
			t := parsePgTimestamp(key)
			feeds, _ := strconv.Atoi(val1.String)
			ml, _ := strconv.Atoi(val2.String)
			result.totalFeeds += feeds
			result.totalMl += ml
			result.buckets = append(result.buckets, domain.ReportBucket{
				BucketStart: t,
				Feeds:       feeds,
				Ml:          ml,
			})
		case "medians":
			result.medianFeeds, _ = strconv.ParseFloat(val1.String, 64)
			result.medianMl, _ = strconv.ParseFloat(val2.String, 64)
		case "hourly":
			hour, _ := strconv.Atoi(key)
			feeds, _ := strconv.Atoi(val1.String)
			result.hourly = append(result.hourly, domain.HourlyBucket{
				Hour:  hour,
				Feeds: feeds,
			})
		}
	}
	if err = rows.Err(); err != nil {
		return feedData{}, fmt.Errorf("error iterating feed report rows: %w", err)
	}
	return result, nil
}

func (s *PostgresStore) diaperReport(ctx context.Context, familyID uuid.UUID, from, to time.Time, granularity string) (diaperData, error) {
	pgGranularity := toPgInterval(granularity)

	query := `
WITH daily AS (
  SELECT date_trunc('day', dd.changed_at) AS day,
         count(*) AS diapers,
         count(*) FILTER (WHERE dd.had_poop) AS poops,
         count(*) FILTER (WHERE dd.had_pee) AS pees
  FROM activities a
  JOIN care_sessions cs ON a.care_session_id = cs.id
  JOIN diaper_details dd ON dd.activity_id = a.id
  WHERE cs.family_id = $1
    AND dd.changed_at >= $2 AND dd.changed_at < $3
    AND a.activity_type = 'diaper'
  GROUP BY day
),
buckets AS (
  SELECT date_trunc($4, day) AS bucket,
         sum(diapers)::int AS diapers
  FROM daily GROUP BY bucket
),
medians AS (
  SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY diapers) AS median_diapers
  FROM daily
),
hourly AS (
  SELECT extract(hour FROM dd.changed_at)::int AS hour,
         count(*) AS diapers
  FROM activities a
  JOIN care_sessions cs ON a.care_session_id = cs.id
  JOIN diaper_details dd ON dd.activity_id = a.id
  WHERE cs.family_id = $1
    AND dd.changed_at >= $2 AND dd.changed_at < $3
    AND a.activity_type = 'diaper'
  GROUP BY hour
),
totals AS (
  SELECT coalesce(sum(diapers), 0)::int AS total_diapers,
         coalesce(sum(poops), 0)::int AS total_poops,
         coalesce(sum(pees), 0)::int AS total_pees
  FROM daily
)
SELECT 'buckets' AS result_type, bucket::text AS key, diapers::text AS val1, '' AS val2
FROM buckets
UNION ALL
SELECT 'medians', '', median_diapers::text, ''
FROM medians
UNION ALL
SELECT 'hourly', hour::text, diapers::text, ''
FROM hourly
UNION ALL
SELECT 'totals', '', total_diapers::text, total_poops::text || ',' || total_pees::text
FROM totals
ORDER BY result_type, key`

	rows, err := s.db.QueryContext(ctx, query, familyID, from, to, pgGranularity)
	if err != nil {
		return diaperData{}, fmt.Errorf("failed to query diaper report: %w", err)
	}
	defer rows.Close()

	var result diaperData
	for rows.Next() {
		var resultType, key string
		var val1, val2 sql.NullString
		if err := rows.Scan(&resultType, &key, &val1, &val2); err != nil {
			return diaperData{}, fmt.Errorf("failed to scan diaper report row: %w", err)
		}
		switch resultType {
		case "buckets":
			t := parsePgTimestamp(key)
			diapers, _ := strconv.Atoi(val1.String)
			result.buckets = append(result.buckets, domain.ReportBucket{
				BucketStart: t,
				Diapers:     diapers,
			})
		case "medians":
			result.medianPerDay, _ = strconv.ParseFloat(val1.String, 64)
		case "hourly":
			hour, _ := strconv.Atoi(key)
			diapers, _ := strconv.Atoi(val1.String)
			result.hourly = append(result.hourly, domain.HourlyBucket{
				Hour:    hour,
				Diapers: diapers,
			})
		case "totals":
			result.totalChanges, _ = strconv.Atoi(val1.String)
			// val2 is "poops,pees"
			parts := splitTwo(val2.String, ',')
			result.totalPoops, _ = strconv.Atoi(parts[0])
			result.totalPees, _ = strconv.Atoi(parts[1])
		}
	}
	if err = rows.Err(); err != nil {
		return diaperData{}, fmt.Errorf("error iterating diaper report rows: %w", err)
	}
	return result, nil
}

func (s *PostgresStore) sleepReport(ctx context.Context, familyID uuid.UUID, from, to time.Time, granularity string) (sleepData, error) {
	pgGranularity := toPgInterval(granularity)

	query := `
WITH daily AS (
  SELECT date_trunc('day', sd.start_time) AS day,
         coalesce(sum(sd.duration_minutes), 0) AS sleep_minutes,
         max(sd.duration_minutes) AS longest_stretch
  FROM activities a
  JOIN care_sessions cs ON a.care_session_id = cs.id
  JOIN sleep_details sd ON sd.activity_id = a.id
  WHERE cs.family_id = $1
    AND sd.start_time >= $2 AND sd.start_time < $3
    AND a.activity_type = 'sleep'
  GROUP BY day
),
buckets AS (
  SELECT date_trunc($4, day) AS bucket,
         sum(sleep_minutes)::int AS sleep_minutes
  FROM daily GROUP BY bucket
),
medians AS (
  SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY sleep_minutes) AS median_sleep,
         percentile_cont(0.5) WITHIN GROUP (ORDER BY longest_stretch) AS median_longest
  FROM daily
),
hourly AS (
  SELECT extract(hour FROM sd.start_time)::int AS hour,
         coalesce(sum(sd.duration_minutes), 0)::int AS sleep_minutes
  FROM activities a
  JOIN care_sessions cs ON a.care_session_id = cs.id
  JOIN sleep_details sd ON sd.activity_id = a.id
  WHERE cs.family_id = $1
    AND sd.start_time >= $2 AND sd.start_time < $3
    AND a.activity_type = 'sleep'
  GROUP BY hour
)
SELECT 'buckets' AS result_type, bucket::text AS key, sleep_minutes::text AS val1, '' AS val2
FROM buckets
UNION ALL
SELECT 'medians', '', median_sleep::text, median_longest::text
FROM medians
UNION ALL
SELECT 'hourly', hour::text, sleep_minutes::text, ''
FROM hourly
ORDER BY result_type, key`

	rows, err := s.db.QueryContext(ctx, query, familyID, from, to, pgGranularity)
	if err != nil {
		return sleepData{}, fmt.Errorf("failed to query sleep report: %w", err)
	}
	defer rows.Close()

	var result sleepData
	for rows.Next() {
		var resultType, key string
		var val1, val2 sql.NullString
		if err := rows.Scan(&resultType, &key, &val1, &val2); err != nil {
			return sleepData{}, fmt.Errorf("failed to scan sleep report row: %w", err)
		}
		switch resultType {
		case "buckets":
			t := parsePgTimestamp(key)
			minutes, _ := strconv.Atoi(val1.String)
			result.totalMinutes += minutes
			result.buckets = append(result.buckets, domain.ReportBucket{
				BucketStart:  t,
				SleepMinutes: minutes,
			})
		case "medians":
			result.medianMinutesPerDay, _ = strconv.ParseFloat(val1.String, 64)
			result.medianLongestStretch, _ = strconv.ParseFloat(val2.String, 64)
		case "hourly":
			hour, _ := strconv.Atoi(key)
			minutes, _ := strconv.Atoi(val1.String)
			result.hourly = append(result.hourly, domain.HourlyBucket{
				Hour:         hour,
				SleepMinutes: minutes,
			})
		}
	}
	if err = rows.Err(); err != nil {
		return sleepData{}, fmt.Errorf("error iterating sleep report rows: %w", err)
	}
	return result, nil
}

func (s *PostgresStore) feedTypeBreakdown(ctx context.Context, familyID uuid.UUID, from, to time.Time) ([]domain.FeedTypeCount, error) {
	query := `
SELECT fd.feed_type, count(*) AS cnt
FROM activities a
JOIN care_sessions cs ON a.care_session_id = cs.id
JOIN feed_details fd ON fd.activity_id = a.id
WHERE cs.family_id = $1
  AND fd.start_time >= $2 AND fd.start_time < $3
  AND a.activity_type = 'feed'
  AND fd.feed_type IS NOT NULL
GROUP BY fd.feed_type`

	rows, err := s.db.QueryContext(ctx, query, familyID, from, to)
	if err != nil {
		return nil, fmt.Errorf("failed to query feed type breakdown: %w", err)
	}
	defer rows.Close()

	var result []domain.FeedTypeCount
	for rows.Next() {
		var ftc domain.FeedTypeCount
		if err := rows.Scan(&ftc.FeedType, &ftc.Count); err != nil {
			return nil, fmt.Errorf("failed to scan feed type breakdown row: %w", err)
		}
		result = append(result, ftc)
	}
	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating feed type breakdown rows: %w", err)
	}
	return result, nil
}

func (s *PostgresStore) computeGoalAdherence(ctx context.Context, familyID uuid.UUID, from, to time.Time, goals *domain.ScheduleGoals) (*domain.GoalAdherence, error) {
	ga := &domain.GoalAdherence{}
	hasAny := false

	// Feed interval adherence
	if goals.TargetFeedIntervalMinutes != nil {
		pct, err := s.computeFeedIntervalAdherence(ctx, familyID, from, to, *goals.TargetFeedIntervalMinutes)
		if err != nil {
			return nil, err
		}
		if pct != nil {
			ga.FeedIntervalAdherencePct = pct
			hasAny = true
		}
	}

	// Nap count adherence
	if goals.TargetNapCount != nil {
		pct, err := s.computeNapCountAdherence(ctx, familyID, from, to, *goals.TargetNapCount)
		if err != nil {
			return nil, err
		}
		if pct != nil {
			ga.NapCountAdherencePct = pct
			hasAny = true
		}
	}

	// Bedtime adherence
	if goals.TargetBedtime != nil {
		avg, err := s.computeBedtimeAdherence(ctx, familyID, from, to, *goals.TargetBedtime)
		if err != nil {
			return nil, err
		}
		if avg != nil {
			ga.BedtimeAdherenceMinutesAvg = avg
			hasAny = true
		}
	}

	// Wake time adherence
	if goals.TargetWakeTime != nil {
		avg, err := s.computeWakeTimeAdherence(ctx, familyID, from, to, *goals.TargetWakeTime)
		if err != nil {
			return nil, err
		}
		if avg != nil {
			ga.WakeTimeAdherenceMinutesAvg = avg
			hasAny = true
		}
	}

	if !hasAny {
		return nil, nil
	}
	return ga, nil
}

func (s *PostgresStore) computeFeedIntervalAdherence(ctx context.Context, familyID uuid.UUID, from, to time.Time, targetMinutes int) (*float64, error) {
	query := `
SELECT fd.start_time,
       LAG(fd.start_time) OVER (ORDER BY fd.start_time) AS prev_time
FROM activities a
JOIN care_sessions cs ON a.care_session_id = cs.id
JOIN feed_details fd ON fd.activity_id = a.id
WHERE cs.family_id = $1
  AND fd.start_time >= $2 AND fd.start_time < $3
  AND a.activity_type = 'feed'
ORDER BY fd.start_time`

	rows, err := s.db.QueryContext(ctx, query, familyID, from, to)
	if err != nil {
		return nil, fmt.Errorf("failed to query feed intervals: %w", err)
	}
	defer rows.Close()

	tolerance := float64(targetMinutes) * 0.25 // 25% tolerance
	var withinCount, totalIntervals int

	for rows.Next() {
		var startTime time.Time
		var prevTime sql.NullTime
		if err := rows.Scan(&startTime, &prevTime); err != nil {
			return nil, fmt.Errorf("failed to scan feed interval row: %w", err)
		}
		if !prevTime.Valid {
			continue
		}
		interval := startTime.Sub(prevTime.Time).Minutes()
		totalIntervals++
		if math.Abs(interval-float64(targetMinutes)) <= tolerance {
			withinCount++
		}
	}
	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating feed intervals: %w", err)
	}

	if totalIntervals == 0 {
		return nil, nil
	}
	pct := float64(withinCount) / float64(totalIntervals) * 100
	return &pct, nil
}

func (s *PostgresStore) computeNapCountAdherence(ctx context.Context, familyID uuid.UUID, from, to time.Time, targetCount int) (*float64, error) {
	query := `
SELECT date_trunc('day', sd.start_time) AS day, count(*) AS naps
FROM activities a
JOIN care_sessions cs ON a.care_session_id = cs.id
JOIN sleep_details sd ON sd.activity_id = a.id
WHERE cs.family_id = $1
  AND sd.start_time >= $2 AND sd.start_time < $3
  AND a.activity_type = 'sleep'
  AND extract(hour FROM sd.start_time) < 18
GROUP BY day`

	rows, err := s.db.QueryContext(ctx, query, familyID, from, to)
	if err != nil {
		return nil, fmt.Errorf("failed to query nap counts: %w", err)
	}
	defer rows.Close()

	var totalPct float64
	var totalDays int
	for rows.Next() {
		var day time.Time
		var naps int
		if err := rows.Scan(&day, &naps); err != nil {
			return nil, fmt.Errorf("failed to scan nap count row: %w", err)
		}
		totalDays++
		dailyPct := float64(naps) / float64(targetCount) * 100
		if dailyPct > 100 {
			dailyPct = 100
		}
		totalPct += dailyPct
	}
	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating nap counts: %w", err)
	}

	if totalDays == 0 {
		return nil, nil
	}

	pct := totalPct / float64(totalDays)
	return &pct, nil
}

func (s *PostgresStore) computeBedtimeAdherence(ctx context.Context, familyID uuid.UUID, from, to time.Time, targetBedtime string) (*float64, error) {
	// Parse target bedtime as HH:MM
	targetTime, err := time.Parse("15:04", targetBedtime)
	if err != nil {
		return nil, fmt.Errorf("failed to parse target bedtime %q: %w", targetBedtime, err)
	}
	targetMinutesOfDay := targetTime.Hour()*60 + targetTime.Minute()

	// Find sleep sessions starting after 6pm (likely bedtimes, not naps)
	query := `
SELECT sd.start_time
FROM activities a
JOIN care_sessions cs ON a.care_session_id = cs.id
JOIN sleep_details sd ON sd.activity_id = a.id
WHERE cs.family_id = $1
  AND sd.start_time >= $2 AND sd.start_time < $3
  AND a.activity_type = 'sleep'
  AND extract(hour FROM sd.start_time) >= 18
ORDER BY sd.start_time`

	rows, err := s.db.QueryContext(ctx, query, familyID, from, to)
	if err != nil {
		return nil, fmt.Errorf("failed to query bedtimes: %w", err)
	}
	defer rows.Close()

	var totalDiff float64
	var count int
	for rows.Next() {
		var startTime time.Time
		if err := rows.Scan(&startTime); err != nil {
			return nil, fmt.Errorf("failed to scan bedtime row: %w", err)
		}
		actualMinutes := startTime.Hour()*60 + startTime.Minute()
		diff := math.Abs(float64(actualMinutes - targetMinutesOfDay))
		totalDiff += diff
		count++
	}
	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating bedtimes: %w", err)
	}

	if count == 0 {
		return nil, nil
	}
	avg := totalDiff / float64(count)
	return &avg, nil
}

func (s *PostgresStore) overnightSleepStats(ctx context.Context, familyID uuid.UUID, from, to time.Time) (domain.OvernightSleepStats, error) {
	query := `
WITH overnight AS (
  SELECT sd.start_time, sd.end_time, sd.duration_minutes
  FROM activities a
  JOIN care_sessions cs ON a.care_session_id = cs.id
  JOIN sleep_details sd ON sd.activity_id = a.id
  WHERE cs.family_id = $1
    AND sd.start_time >= $2 AND sd.start_time < $3
    AND a.activity_type = 'sleep'
    AND (extract(hour FROM sd.start_time) >= 18 OR extract(hour FROM sd.start_time) < 5)
),
nightly AS (
  SELECT date_trunc('day', start_time) AS night,
         sum(duration_minutes) AS minutes,
         max(duration_minutes) AS longest_stretch
  FROM overnight
  GROUP BY night
)
SELECT
  coalesce((SELECT sum(duration_minutes) FROM overnight), 0) AS total_minutes,
  (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY minutes) FROM nightly) AS median_per_night,
  (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY longest_stretch) FROM nightly) AS median_longest,
  (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM start_time)::bigint % 86400) FROM overnight) AS median_bedtime_sec,
  (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM end_time)::bigint % 86400) FROM overnight WHERE end_time IS NOT NULL) AS median_waketime_sec,
  coalesce((SELECT count(*) FROM overnight), 0) AS count`

	var result domain.OvernightSleepStats
	var totalMin int64
	var medianPerNight, medianLongest, medianBedtimeSec, medianWaketimeSec sql.NullFloat64
	var cnt int64

	err := s.db.QueryRowContext(ctx, query, familyID, from, to).Scan(
		&totalMin, &medianPerNight, &medianLongest, &medianBedtimeSec, &medianWaketimeSec, &cnt,
	)
	if err != nil {
		return result, fmt.Errorf("failed to query overnight sleep stats: %w", err)
	}

	result.TotalMinutes = int(totalMin)
	result.Count = int(cnt)
	if medianPerNight.Valid {
		result.MedianMinutesPerNight = medianPerNight.Float64
	}
	if medianLongest.Valid {
		result.MedianLongestStretchMinutes = medianLongest.Float64
	}
	if medianBedtimeSec.Valid {
		result.MedianBedtime = secondsToHHMM(medianBedtimeSec.Float64)
	}
	if medianWaketimeSec.Valid {
		result.MedianWakeTime = secondsToHHMM(medianWaketimeSec.Float64)
	}

	return result, nil
}

func (s *PostgresStore) napSleepStats(ctx context.Context, familyID uuid.UUID, from, to time.Time) (domain.NapStats, error) {
	query := `
WITH naps AS (
  SELECT sd.start_time, sd.duration_minutes
  FROM activities a
  JOIN care_sessions cs ON a.care_session_id = cs.id
  JOIN sleep_details sd ON sd.activity_id = a.id
  WHERE cs.family_id = $1
    AND sd.start_time >= $2 AND sd.start_time < $3
    AND a.activity_type = 'sleep'
    AND extract(hour FROM sd.start_time) >= 5
    AND extract(hour FROM sd.start_time) < 18
),
daily AS (
  SELECT date_trunc('day', start_time) AS day,
         count(*) AS nap_count
  FROM naps
  GROUP BY day
)
SELECT
  coalesce((SELECT sum(duration_minutes) FROM naps), 0) AS total_minutes,
  (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY nap_count) FROM daily) AS median_naps_per_day,
  (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY duration_minutes) FROM naps) AS median_duration,
  coalesce((SELECT count(*) FROM naps), 0) AS count`

	var result domain.NapStats
	var totalMin int64
	var medianNapsPerDay, medianDuration sql.NullFloat64
	var cnt int64

	err := s.db.QueryRowContext(ctx, query, familyID, from, to).Scan(
		&totalMin, &medianNapsPerDay, &medianDuration, &cnt,
	)
	if err != nil {
		return result, fmt.Errorf("failed to query nap stats: %w", err)
	}

	result.TotalMinutes = int(totalMin)
	result.Count = int(cnt)
	if medianNapsPerDay.Valid {
		result.MedianNapsPerDay = medianNapsPerDay.Float64
	}
	if medianDuration.Valid {
		result.MedianNapDurationMinutes = medianDuration.Float64
	}

	return result, nil
}

func (s *PostgresStore) computeWakeTimeAdherence(ctx context.Context, familyID uuid.UUID, from, to time.Time, targetWakeTime string) (*float64, error) {
	targetTime, err := time.Parse("15:04", targetWakeTime)
	if err != nil {
		return nil, fmt.Errorf("failed to parse target wake time %q: %w", targetWakeTime, err)
	}
	targetMinutesOfDay := targetTime.Hour()*60 + targetTime.Minute()

	query := `
SELECT sd.end_time
FROM activities a
JOIN care_sessions cs ON a.care_session_id = cs.id
JOIN sleep_details sd ON sd.activity_id = a.id
WHERE cs.family_id = $1
  AND sd.start_time >= $2 AND sd.start_time < $3
  AND a.activity_type = 'sleep'
  AND (extract(hour FROM sd.start_time) >= 18 OR extract(hour FROM sd.start_time) < 5)
  AND sd.end_time IS NOT NULL
ORDER BY sd.end_time`

	rows, err := s.db.QueryContext(ctx, query, familyID, from, to)
	if err != nil {
		return nil, fmt.Errorf("failed to query wake times: %w", err)
	}
	defer rows.Close()

	var totalDiff float64
	var count int
	for rows.Next() {
		var endTime time.Time
		if err := rows.Scan(&endTime); err != nil {
			return nil, fmt.Errorf("failed to scan wake time row: %w", err)
		}
		actualMinutes := endTime.Hour()*60 + endTime.Minute()
		diff := math.Abs(float64(actualMinutes - targetMinutesOfDay))
		totalDiff += diff
		count++
	}
	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating wake times: %w", err)
	}

	if count == 0 {
		return nil, nil
	}
	avg := totalDiff / float64(count)
	return &avg, nil
}

func secondsToHHMM(secs float64) *string {
	totalMinutes := int(math.Round(secs / 60))
	h := totalMinutes / 60
	m := totalMinutes % 60
	if h < 0 {
		h += 24
	}
	s := fmt.Sprintf("%02d:%02d", h%24, m)
	return &s
}

// Helper functions

// parsePgTimestamp parses a PostgreSQL timestamp text representation.
// Postgres outputs timestamps like "2026-04-12 00:00:00+00" or "2026-04-12 00:00:00-05".
func parsePgTimestamp(s string) time.Time {
	formats := []string{
		"2006-01-02 15:04:05-07",
		"2006-01-02 15:04:05-07:00",
		"2006-01-02T15:04:05Z07:00",
		"2006-01-02 15:04:05",
	}
	for _, f := range formats {
		if t, err := time.Parse(f, s); err == nil {
			return t
		}
	}
	return time.Time{}
}

func toPgInterval(granularity string) string {
	switch granularity {
	case "WEEK":
		return "week"
	case "MONTH":
		return "month"
	default:
		return "day"
	}
}

func splitTwo(s string, sep byte) [2]string {
	for i := 0; i < len(s); i++ {
		if s[i] == sep {
			return [2]string{s[:i], s[i+1:]}
		}
	}
	return [2]string{s, ""}
}

func mergeBuckets(feed, diaper, sleep []domain.ReportBucket) []domain.ReportBucket {
	// Use Unix timestamp as key to avoid time.Time comparison issues
	m := make(map[int64]*domain.ReportBucket)
	for _, b := range feed {
		entry := getOrCreate(m, b.BucketStart)
		entry.Feeds = b.Feeds
		entry.Ml = b.Ml
	}
	for _, b := range diaper {
		entry := getOrCreate(m, b.BucketStart)
		entry.Diapers = b.Diapers
	}
	for _, b := range sleep {
		entry := getOrCreate(m, b.BucketStart)
		entry.SleepMinutes = b.SleepMinutes
	}

	result := make([]domain.ReportBucket, 0, len(m))
	for _, v := range m {
		result = append(result, *v)
	}
	sortBuckets(result)
	return result
}

func getOrCreate(m map[int64]*domain.ReportBucket, t time.Time) *domain.ReportBucket {
	key := t.Unix()
	if b, ok := m[key]; ok {
		return b
	}
	b := &domain.ReportBucket{BucketStart: t}
	m[key] = b
	return b
}

func sortBuckets(buckets []domain.ReportBucket) {
	for i := 1; i < len(buckets); i++ {
		for j := i; j > 0 && buckets[j].BucketStart.Before(buckets[j-1].BucketStart); j-- {
			buckets[j], buckets[j-1] = buckets[j-1], buckets[j]
		}
	}
}

func mergeHourly(feed, diaper, sleep []domain.HourlyBucket) []domain.HourlyBucket {
	m := make(map[int]*domain.HourlyBucket)
	for _, h := range feed {
		entry := getOrCreateHourly(m, h.Hour)
		entry.Feeds = h.Feeds
	}
	for _, h := range diaper {
		entry := getOrCreateHourly(m, h.Hour)
		entry.Diapers = h.Diapers
	}
	for _, h := range sleep {
		entry := getOrCreateHourly(m, h.Hour)
		entry.SleepMinutes = h.SleepMinutes
	}

	result := make([]domain.HourlyBucket, 0, len(m))
	for _, v := range m {
		result = append(result, *v)
	}
	// Sort by hour
	for i := 1; i < len(result); i++ {
		for j := i; j > 0 && result[j].Hour < result[j-1].Hour; j-- {
			result[j], result[j-1] = result[j-1], result[j]
		}
	}
	return result
}

func getOrCreateHourly(m map[int]*domain.HourlyBucket, hour int) *domain.HourlyBucket {
	if h, ok := m[hour]; ok {
		return h
	}
	h := &domain.HourlyBucket{Hour: hour}
	m[hour] = h
	return h
}
