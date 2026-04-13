package postgres

import (
	"context"
	"math"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/swatkatz/babybaton/backend/internal/domain"
)

func TestCareReport(t *testing.T) {
	store, err := NewPostgresStore("postgres://postgres:postgres@localhost:5432/baby_baton_test?sslmode=disable")
	if err != nil {
		t.Fatalf("Failed to connect to database: %v", err)
	}
	defer store.Close()

	ctx := context.Background()

	family, caregiver, err := CreateTestFamily(ctx, store)
	if err != nil {
		t.Fatalf("Failed to create test family: %v", err)
	}

	t.Cleanup(func() {
		store.DeleteFamily(ctx, family.ID)
		t.Logf("✓ Cleaned up test family %s", family.ID)
	})

	// Create a care session
	session := &domain.CareSession{
		ID:          uuid.New(),
		CaregiverID: caregiver.ID,
		FamilyID:    family.ID,
		Status:      domain.StatusInProgress,
		StartedAt:   time.Now(),
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	if err := store.CreateCareSession(ctx, session); err != nil {
		t.Fatalf("Failed to create session: %v", err)
	}

	// Base time: 3 days ago at 8am UTC
	baseTime := time.Now().UTC().Truncate(24*time.Hour).AddDate(0, 0, -3).Add(8 * time.Hour)

	// Seed activities across 3 days
	feedType := domain.FeedTypeFormula
	breastType := domain.FeedTypeBreastMilk
	amountMl := 150

	for day := 0; day < 3; day++ {
		dayStart := baseTime.Add(time.Duration(day) * 24 * time.Hour)

		// 3 feeds per day at hours 8, 11, 14
		for _, hourOffset := range []int{0, 3, 6} {
			feedTime := dayStart.Add(time.Duration(hourOffset) * time.Hour)
			ft := feedType
			if hourOffset == 0 {
				ft = breastType
			}
			createFeedActivity(t, ctx, store, session.ID, feedTime, &amountMl, &ft)
		}

		// 2 diaper changes per day at hours 9, 13
		for i, hourOffset := range []int{1, 5} {
			diaperTime := dayStart.Add(time.Duration(hourOffset) * time.Hour)
			createDiaperActivity(t, ctx, store, session.ID, diaperTime, i == 0, true)
		}

		// 2 sleeps per day at hours 10 (30 min nap) and 20 (bedtime, 60 min)
		createSleepActivity(t, ctx, store, session.ID, dayStart.Add(2*time.Hour), 30)
		createSleepActivity(t, ctx, store, session.ID, dayStart.Add(12*time.Hour), 60) // 8pm
	}

	from := baseTime.Add(-1 * time.Hour) // a bit before first activity
	to := baseTime.Add(4 * 24 * time.Hour)

	t.Run("DAY granularity", func(t *testing.T) {
		report, err := store.CareReport(ctx, family.ID, from, to, "DAY")
		if err != nil {
			t.Fatalf("CareReport failed: %v", err)
		}

		// Totals
		if report.Totals.TotalFeeds != 9 {
			t.Errorf("TotalFeeds = %d, want 9", report.Totals.TotalFeeds)
		}
		if report.Totals.TotalMl != 9*150 {
			t.Errorf("TotalMl = %d, want %d", report.Totals.TotalMl, 9*150)
		}
		if report.Totals.TotalDiaperChanges != 6 {
			t.Errorf("TotalDiaperChanges = %d, want 6", report.Totals.TotalDiaperChanges)
		}
		if report.Totals.TotalPoops != 3 {
			t.Errorf("TotalPoops = %d, want 3", report.Totals.TotalPoops)
		}
		if report.Totals.TotalPees != 6 {
			t.Errorf("TotalPees = %d, want 6", report.Totals.TotalPees)
		}
		if report.Totals.TotalSleepMinutes != 6*30+6*60-3*60 {
			// Actually: 3 days * (30 + 60) = 270
			if report.Totals.TotalSleepMinutes != 270 {
				t.Errorf("TotalSleepMinutes = %d, want 270", report.Totals.TotalSleepMinutes)
			}
		}

		// Buckets: should have 3 day buckets
		if len(report.Buckets) != 3 {
			t.Errorf("Buckets count = %d, want 3", len(report.Buckets))
		}

		// Each day bucket should have 3 feeds, 2 diapers, 90 sleep minutes
		for _, b := range report.Buckets {
			if b.Feeds != 3 {
				t.Errorf("Bucket %v feeds = %d, want 3", b.BucketStart, b.Feeds)
			}
			if b.Diapers != 2 {
				t.Errorf("Bucket %v diapers = %d, want 2", b.BucketStart, b.Diapers)
			}
			if b.SleepMinutes != 90 {
				t.Errorf("Bucket %v sleep = %d, want 90", b.BucketStart, b.SleepMinutes)
			}
		}

		// Medians (3 identical days: 3 feeds, 450 ml, 2 diapers, 90 sleep, 60 longest)
		if report.Totals.MedianFeedsPerDay != 3 {
			t.Errorf("MedianFeedsPerDay = %v, want 3", report.Totals.MedianFeedsPerDay)
		}
		if report.Totals.MedianMlPerDay != 450 {
			t.Errorf("MedianMlPerDay = %v, want 450", report.Totals.MedianMlPerDay)
		}
		if report.Totals.MedianDiapersPerDay != 2 {
			t.Errorf("MedianDiapersPerDay = %v, want 2", report.Totals.MedianDiapersPerDay)
		}
		if report.Totals.MedianSleepMinutesPerDay != 90 {
			t.Errorf("MedianSleepMinutesPerDay = %v, want 90", report.Totals.MedianSleepMinutesPerDay)
		}
		if report.Totals.MedianLongestStretchMinutes != 60 {
			t.Errorf("MedianLongestStretchMinutes = %v, want 60", report.Totals.MedianLongestStretchMinutes)
		}

		// Overnight stats: 3 bedtime sleeps at hour 20, 60 min each
		if report.Totals.OvernightStats.Count != 3 {
			t.Errorf("OvernightStats.Count = %d, want 3", report.Totals.OvernightStats.Count)
		}
		if report.Totals.OvernightStats.TotalMinutes != 180 {
			t.Errorf("OvernightStats.TotalMinutes = %d, want 180", report.Totals.OvernightStats.TotalMinutes)
		}

		// Nap stats: 3 naps at hour 10, 30 min each
		if report.Totals.NapStats.Count != 3 {
			t.Errorf("NapStats.Count = %d, want 3", report.Totals.NapStats.Count)
		}
		if report.Totals.NapStats.TotalMinutes != 90 {
			t.Errorf("NapStats.TotalMinutes = %d, want 90", report.Totals.NapStats.TotalMinutes)
		}

		t.Logf("✓ DAY granularity report correct")
	})

	t.Run("WEEK granularity", func(t *testing.T) {
		report, err := store.CareReport(ctx, family.ID, from, to, "WEEK")
		if err != nil {
			t.Fatalf("CareReport failed: %v", err)
		}

		// All 3 days should fall within 1-2 weekly buckets depending on day-of-week
		if len(report.Buckets) < 1 || len(report.Buckets) > 2 {
			t.Errorf("WEEK buckets = %d, want 1 or 2", len(report.Buckets))
		}

		// Totals should be the same regardless of granularity
		if report.Totals.TotalFeeds != 9 {
			t.Errorf("TotalFeeds = %d, want 9", report.Totals.TotalFeeds)
		}

		t.Logf("✓ WEEK granularity report correct")
	})

	t.Run("MONTH granularity", func(t *testing.T) {
		report, err := store.CareReport(ctx, family.ID, from, to, "MONTH")
		if err != nil {
			t.Fatalf("CareReport failed: %v", err)
		}

		// 3 days within same month = 1 bucket (unless crossing month boundary)
		if len(report.Buckets) < 1 || len(report.Buckets) > 2 {
			t.Errorf("MONTH buckets = %d, want 1 or 2", len(report.Buckets))
		}

		if report.Totals.TotalFeeds != 9 {
			t.Errorf("TotalFeeds = %d, want 9", report.Totals.TotalFeeds)
		}

		t.Logf("✓ MONTH granularity report correct")
	})

	t.Run("hourly histogram", func(t *testing.T) {
		report, err := store.CareReport(ctx, family.ID, from, to, "DAY")
		if err != nil {
			t.Fatalf("CareReport failed: %v", err)
		}

		if len(report.HourlyPattern) == 0 {
			t.Fatal("HourlyPattern is empty")
		}

		// Feeds at hours 8, 11, 14
		feedHours := make(map[int]int)
		for _, h := range report.HourlyPattern {
			if h.Feeds > 0 {
				feedHours[h.Hour] = h.Feeds
			}
		}
		for _, expectedHour := range []int{8, 11, 14} {
			if feedHours[expectedHour] != 3 {
				t.Errorf("Feed count at hour %d = %d, want 3", expectedHour, feedHours[expectedHour])
			}
		}

		t.Logf("✓ Hourly histogram correct")
	})

	t.Run("feed type breakdown", func(t *testing.T) {
		report, err := store.CareReport(ctx, family.ID, from, to, "DAY")
		if err != nil {
			t.Fatalf("CareReport failed: %v", err)
		}

		breakdown := make(map[string]int)
		for _, ftc := range report.Totals.FeedTypeBreakdown {
			breakdown[ftc.FeedType] = ftc.Count
		}

		// 1 breast_milk + 2 formula per day * 3 days
		if breakdown["breast_milk"] != 3 {
			t.Errorf("breast_milk count = %d, want 3", breakdown["breast_milk"])
		}
		if breakdown["formula"] != 6 {
			t.Errorf("formula count = %d, want 6", breakdown["formula"])
		}

		t.Logf("✓ Feed type breakdown correct")
	})

	t.Run("empty date range", func(t *testing.T) {
		farFuture := time.Now().AddDate(1, 0, 0)
		report, err := store.CareReport(ctx, family.ID, farFuture, farFuture.Add(24*time.Hour), "DAY")
		if err != nil {
			t.Fatalf("CareReport failed: %v", err)
		}

		if report.Totals.TotalFeeds != 0 {
			t.Errorf("TotalFeeds = %d, want 0", report.Totals.TotalFeeds)
		}
		if report.Totals.TotalDiaperChanges != 0 {
			t.Errorf("TotalDiaperChanges = %d, want 0", report.Totals.TotalDiaperChanges)
		}
		if report.Totals.TotalSleepMinutes != 0 {
			t.Errorf("TotalSleepMinutes = %d, want 0", report.Totals.TotalSleepMinutes)
		}
		if len(report.Buckets) != 0 {
			t.Errorf("Buckets count = %d, want 0", len(report.Buckets))
		}
		if report.GoalAdherence != nil {
			t.Error("GoalAdherence should be nil for empty range")
		}

		t.Logf("✓ Empty date range returns zeros")
	})

	t.Run("goal adherence nil when no goals", func(t *testing.T) {
		report, err := store.CareReport(ctx, family.ID, from, to, "DAY")
		if err != nil {
			t.Fatalf("CareReport failed: %v", err)
		}

		if report.GoalAdherence != nil {
			t.Error("GoalAdherence should be nil when no schedule goals exist")
		}

		t.Logf("✓ Goal adherence nil when no goals set")
	})

	t.Run("goal adherence with goals", func(t *testing.T) {
		// Set up schedule goals
		targetInterval := 180 // 3 hours
		targetNaps := 1
		targetBedtime := "20:00"
		goals := &domain.ScheduleGoals{
			TargetFeedIntervalMinutes: &targetInterval,
			TargetNapCount:            &targetNaps,
			TargetBedtime:             &targetBedtime,
		}
		_, err := store.UpsertScheduleGoals(ctx, family.ID, goals)
		if err != nil {
			t.Fatalf("Failed to upsert schedule goals: %v", err)
		}

		report, err := store.CareReport(ctx, family.ID, from, to, "DAY")
		if err != nil {
			t.Fatalf("CareReport failed: %v", err)
		}

		if report.GoalAdherence == nil {
			t.Fatal("GoalAdherence should not be nil when goals are set")
		}

		// Feed intervals: feeds at 8am, 11am, 14pm each day = 3hr intervals
		// Target is 180 min (3hr) with 25% tolerance (45 min)
		// All intervals should be exactly on target
		if report.GoalAdherence.FeedIntervalAdherencePct == nil {
			t.Error("FeedIntervalAdherencePct should not be nil")
		} else if *report.GoalAdherence.FeedIntervalAdherencePct < 50 {
			t.Errorf("FeedIntervalAdherencePct = %.1f, want >= 50", *report.GoalAdherence.FeedIntervalAdherencePct)
		}

		// Nap count: 1 daytime nap per day (hour 10), overnight (hour 20) excluded, target is 1 => 100%
		if report.GoalAdherence.NapCountAdherencePct == nil {
			t.Error("NapCountAdherencePct should not be nil")
		} else if *report.GoalAdherence.NapCountAdherencePct != 100 {
			t.Errorf("NapCountAdherencePct = %.1f, want 100", *report.GoalAdherence.NapCountAdherencePct)
		}

		// Bedtime: sleeps at 8pm (20:00), target is 20:00 => 0 minutes off
		if report.GoalAdherence.BedtimeAdherenceMinutesAvg == nil {
			t.Error("BedtimeAdherenceMinutesAvg should not be nil")
		} else if math.Abs(*report.GoalAdherence.BedtimeAdherenceMinutesAvg) > 1 {
			t.Errorf("BedtimeAdherenceMinutesAvg = %.1f, want ~0", *report.GoalAdherence.BedtimeAdherenceMinutesAvg)
		}

		t.Logf("✓ Goal adherence computed correctly")
	})
}

func TestNapCountAdherence(t *testing.T) {
	store, err := NewPostgresStore("postgres://postgres:postgres@localhost:5432/baby_baton_test?sslmode=disable")
	if err != nil {
		t.Fatalf("Failed to connect to database: %v", err)
	}
	defer store.Close()

	ctx := context.Background()

	setupFamily := func(t *testing.T) (*domain.Family, *domain.CareSession) {
		t.Helper()
		family, caregiver, err := CreateTestFamily(ctx, store)
		if err != nil {
			t.Fatalf("Failed to create test family: %v", err)
		}
		t.Cleanup(func() { store.DeleteFamily(ctx, family.ID) })

		session := &domain.CareSession{
			ID:          uuid.New(),
			CaregiverID: caregiver.ID,
			FamilyID:    family.ID,
			Status:      domain.StatusInProgress,
			StartedAt:   time.Now(),
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		}
		if err := store.CreateCareSession(ctx, session); err != nil {
			t.Fatalf("Failed to create session: %v", err)
		}
		return family, session
	}

	t.Run("exact target", func(t *testing.T) {
		family, session := setupFamily(t)
		dayStart := time.Now().UTC().Truncate(24 * time.Hour).Add(8 * time.Hour)

		for _, hour := range []int{9, 11, 14} {
			createSleepActivity(t, ctx, store, session.ID, dayStart.Add(time.Duration(hour-8)*time.Hour), 30)
		}

		from := dayStart.Add(-1 * time.Hour)
		to := dayStart.Add(24 * time.Hour)
		pct, err := store.computeNapCountAdherence(ctx, family.ID, from, to, 3)
		if err != nil {
			t.Fatalf("computeNapCountAdherence failed: %v", err)
		}
		if pct == nil {
			t.Fatal("expected non-nil result")
		}
		if *pct != 100 {
			t.Errorf("got %.1f%%, want 100%%", *pct)
		}
	})

	t.Run("under target", func(t *testing.T) {
		family, session := setupFamily(t)
		dayStart := time.Now().UTC().Truncate(24 * time.Hour).Add(8 * time.Hour)

		for _, hour := range []int{10, 13} {
			createSleepActivity(t, ctx, store, session.ID, dayStart.Add(time.Duration(hour-8)*time.Hour), 30)
		}

		from := dayStart.Add(-1 * time.Hour)
		to := dayStart.Add(24 * time.Hour)
		pct, err := store.computeNapCountAdherence(ctx, family.ID, from, to, 3)
		if err != nil {
			t.Fatalf("computeNapCountAdherence failed: %v", err)
		}
		if pct == nil {
			t.Fatal("expected non-nil result")
		}
		expected := 66.7
		if math.Abs(*pct-expected) > 0.1 {
			t.Errorf("got %.1f%%, want ~%.1f%%", *pct, expected)
		}
	})

	t.Run("over target capped at 100", func(t *testing.T) {
		family, session := setupFamily(t)
		dayStart := time.Now().UTC().Truncate(24 * time.Hour).Add(8 * time.Hour)

		for _, hour := range []int{9, 11, 13, 15} {
			createSleepActivity(t, ctx, store, session.ID, dayStart.Add(time.Duration(hour-8)*time.Hour), 30)
		}

		from := dayStart.Add(-1 * time.Hour)
		to := dayStart.Add(24 * time.Hour)
		pct, err := store.computeNapCountAdherence(ctx, family.ID, from, to, 3)
		if err != nil {
			t.Fatalf("computeNapCountAdherence failed: %v", err)
		}
		if pct == nil {
			t.Fatal("expected non-nil result")
		}
		if *pct != 100 {
			t.Errorf("got %.1f%%, want 100%%", *pct)
		}
	})

	t.Run("overnight sleep excluded", func(t *testing.T) {
		family, session := setupFamily(t)
		dayStart := time.Now().UTC().Truncate(24 * time.Hour).Add(8 * time.Hour)

		for _, hour := range []int{9, 11, 14} {
			createSleepActivity(t, ctx, store, session.ID, dayStart.Add(time.Duration(hour-8)*time.Hour), 30)
		}
		createSleepActivity(t, ctx, store, session.ID, dayStart.Add(12*time.Hour), 60) // 8pm, excluded

		from := dayStart.Add(-1 * time.Hour)
		to := dayStart.Add(24 * time.Hour)
		pct, err := store.computeNapCountAdherence(ctx, family.ID, from, to, 3)
		if err != nil {
			t.Fatalf("computeNapCountAdherence failed: %v", err)
		}
		if pct == nil {
			t.Fatal("expected non-nil result")
		}
		if *pct != 100 {
			t.Errorf("got %.1f%%, want 100%% (overnight should be excluded)", *pct)
		}
	})

	t.Run("multi-day average", func(t *testing.T) {
		family, session := setupFamily(t)
		day1Start := time.Now().UTC().Truncate(24 * time.Hour).AddDate(0, 0, -1).Add(8 * time.Hour)
		day2Start := day1Start.Add(24 * time.Hour)

		// Day 1: 3 naps (100%)
		for _, hour := range []int{9, 11, 14} {
			createSleepActivity(t, ctx, store, session.ID, day1Start.Add(time.Duration(hour-8)*time.Hour), 30)
		}
		// Day 2: 2 naps (66.7%)
		for _, hour := range []int{10, 13} {
			createSleepActivity(t, ctx, store, session.ID, day2Start.Add(time.Duration(hour-8)*time.Hour), 30)
		}

		from := day1Start.Add(-1 * time.Hour)
		to := day2Start.Add(24 * time.Hour)
		pct, err := store.computeNapCountAdherence(ctx, family.ID, from, to, 3)
		if err != nil {
			t.Fatalf("computeNapCountAdherence failed: %v", err)
		}
		if pct == nil {
			t.Fatal("expected non-nil result")
		}
		expected := 83.3
		if math.Abs(*pct-expected) > 0.5 {
			t.Errorf("got %.1f%%, want ~%.1f%%", *pct, expected)
		}
	})

	t.Run("no sleep data returns nil", func(t *testing.T) {
		family, _ := setupFamily(t)
		farFuture := time.Now().AddDate(1, 0, 0)

		pct, err := store.computeNapCountAdherence(ctx, family.ID, farFuture, farFuture.Add(24*time.Hour), 3)
		if err != nil {
			t.Fatalf("computeNapCountAdherence failed: %v", err)
		}
		if pct != nil {
			t.Errorf("expected nil for no data, got %.1f", *pct)
		}
	})

	t.Run("only evening sleep returns nil", func(t *testing.T) {
		family, session := setupFamily(t)
		dayStart := time.Now().UTC().Truncate(24 * time.Hour).Add(8 * time.Hour)

		createSleepActivity(t, ctx, store, session.ID, dayStart.Add(12*time.Hour), 60) // 8pm

		from := dayStart.Add(-1 * time.Hour)
		to := dayStart.Add(24 * time.Hour)
		pct, err := store.computeNapCountAdherence(ctx, family.ID, from, to, 3)
		if err != nil {
			t.Fatalf("computeNapCountAdherence failed: %v", err)
		}
		if pct != nil {
			t.Errorf("expected nil when only overnight sleep exists, got %.1f", *pct)
		}
	})
}

func TestOvernightAndNapStats(t *testing.T) {
	store, err := NewPostgresStore("postgres://postgres:postgres@localhost:5432/baby_baton_test?sslmode=disable")
	if err != nil {
		t.Fatalf("Failed to connect to database: %v", err)
	}
	defer store.Close()

	ctx := context.Background()

	setupFamily := func(t *testing.T) (*domain.Family, *domain.CareSession) {
		t.Helper()
		family, caregiver, err := CreateTestFamily(ctx, store)
		if err != nil {
			t.Fatalf("Failed to create test family: %v", err)
		}
		t.Cleanup(func() { store.DeleteFamily(ctx, family.ID) })

		session := &domain.CareSession{
			ID:          uuid.New(),
			CaregiverID: caregiver.ID,
			FamilyID:    family.ID,
			Status:      domain.StatusInProgress,
			StartedAt:   time.Now(),
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		}
		if err := store.CreateCareSession(ctx, session); err != nil {
			t.Fatalf("Failed to create session: %v", err)
		}
		return family, session
	}

	t.Run("overnight and nap split correctly", func(t *testing.T) {
		family, session := setupFamily(t)
		// Use a fixed base to avoid timezone issues
		dayStart := time.Now().UTC().Truncate(24 * time.Hour).Add(5 * time.Hour)

		// Nap at 14:00 (30 min) — should be in nap stats
		createSleepActivity(t, ctx, store, session.ID, dayStart.Add(9*time.Hour), 30)
		// Overnight at 20:00 (480 min / 8 hours, ends 04:00) — should be in overnight stats
		createSleepActivity(t, ctx, store, session.ID, dayStart.Add(15*time.Hour), 480)

		from := dayStart.Add(-1 * time.Hour)
		to := dayStart.Add(24 * time.Hour)

		report, err := store.CareReport(ctx, family.ID, from, to, "DAY")
		if err != nil {
			t.Fatalf("CareReport failed: %v", err)
		}

		// Overnight stats
		if report.Totals.OvernightStats.Count != 1 {
			t.Errorf("overnight count = %d, want 1", report.Totals.OvernightStats.Count)
		}
		if report.Totals.OvernightStats.TotalMinutes != 480 {
			t.Errorf("overnight total minutes = %d, want 480", report.Totals.OvernightStats.TotalMinutes)
		}
		// Only 1 sample — below minimum of 3, so bedtime/wake should be nil
		if report.Totals.OvernightStats.MedianBedtime != nil {
			t.Errorf("overnight median bedtime should be nil with <3 samples, got %s", *report.Totals.OvernightStats.MedianBedtime)
		}
		if report.Totals.OvernightStats.MedianBedtimeSampleCount != 1 {
			t.Errorf("bedtime sample count = %d, want 1", report.Totals.OvernightStats.MedianBedtimeSampleCount)
		}
		if report.Totals.OvernightStats.MedianWakeTime != nil {
			t.Errorf("overnight median wake time should be nil with <3 samples, got %s", *report.Totals.OvernightStats.MedianWakeTime)
		}
		if report.Totals.OvernightStats.MedianWakeTimeSampleCount != 1 {
			t.Errorf("wake time sample count = %d, want 1", report.Totals.OvernightStats.MedianWakeTimeSampleCount)
		}

		// Nap stats
		if report.Totals.NapStats.Count != 1 {
			t.Errorf("nap count = %d, want 1", report.Totals.NapStats.Count)
		}
		if report.Totals.NapStats.TotalMinutes != 30 {
			t.Errorf("nap total minutes = %d, want 30", report.Totals.NapStats.TotalMinutes)
		}
		if report.Totals.NapStats.MedianNapDurationMinutes != 30 {
			t.Errorf("median nap duration = %.1f, want 30", report.Totals.NapStats.MedianNapDurationMinutes)
		}
	})

	t.Run("multi-night medians", func(t *testing.T) {
		family, session := setupFamily(t)
		day1 := time.Now().UTC().Truncate(24 * time.Hour).AddDate(0, 0, -2).Add(5 * time.Hour)
		day2 := day1.Add(24 * time.Hour)

		// Night 1: bedtime 19:30, 540 min (9 hours), wakes 04:30
		createSleepActivity(t, ctx, store, session.ID, day1.Add(14*time.Hour+30*time.Minute), 540)
		// Night 2: bedtime 20:30, 420 min (7 hours), wakes 03:30
		createSleepActivity(t, ctx, store, session.ID, day2.Add(15*time.Hour+30*time.Minute), 420)

		from := day1.Add(-1 * time.Hour)
		to := day2.Add(24 * time.Hour)

		stats, err := store.overnightSleepStats(ctx, family.ID, from, to)
		if err != nil {
			t.Fatalf("overnightSleepStats failed: %v", err)
		}

		if stats.Count != 2 {
			t.Errorf("count = %d, want 2", stats.Count)
		}
		if stats.TotalMinutes != 960 {
			t.Errorf("total minutes = %d, want 960", stats.TotalMinutes)
		}
		// Only 2 samples — below minimum of 3, so bedtime/wake should be nil
		if stats.MedianBedtime != nil {
			t.Errorf("median bedtime should be nil with <3 samples, got %s", *stats.MedianBedtime)
		}
		if stats.MedianBedtimeSampleCount != 2 {
			t.Errorf("bedtime sample count = %d, want 2", stats.MedianBedtimeSampleCount)
		}
		if stats.MedianWakeTime != nil {
			t.Errorf("median wake time should be nil with <3 samples, got %s", *stats.MedianWakeTime)
		}
		if stats.MedianWakeTimeSampleCount != 2 {
			t.Errorf("wake time sample count = %d, want 2", stats.MedianWakeTimeSampleCount)
		}
	})

	t.Run("empty data returns zeros", func(t *testing.T) {
		family, _ := setupFamily(t)
		farFuture := time.Now().AddDate(1, 0, 0)

		overnight, err := store.overnightSleepStats(ctx, family.ID, farFuture, farFuture.Add(24*time.Hour))
		if err != nil {
			t.Fatalf("overnightSleepStats failed: %v", err)
		}
		if overnight.Count != 0 {
			t.Errorf("overnight count = %d, want 0", overnight.Count)
		}
		if overnight.TotalMinutes != 0 {
			t.Errorf("overnight total = %d, want 0", overnight.TotalMinutes)
		}
		if overnight.MedianBedtime != nil {
			t.Error("median bedtime should be nil for no data")
		}
		if overnight.MedianBedtimeSampleCount != 0 {
			t.Errorf("bedtime sample count = %d, want 0", overnight.MedianBedtimeSampleCount)
		}
		if overnight.MedianWakeTimeSampleCount != 0 {
			t.Errorf("wake time sample count = %d, want 0", overnight.MedianWakeTimeSampleCount)
		}

		naps, err := store.napSleepStats(ctx, family.ID, farFuture, farFuture.Add(24*time.Hour))
		if err != nil {
			t.Fatalf("napSleepStats failed: %v", err)
		}
		if naps.Count != 0 {
			t.Errorf("nap count = %d, want 0", naps.Count)
		}
		if naps.TotalMinutes != 0 {
			t.Errorf("nap total = %d, want 0", naps.TotalMinutes)
		}
	})

	t.Run("3+ samples returns median bedtime and wake with counts", func(t *testing.T) {
		family, session := setupFamily(t)
		day1 := time.Now().UTC().Truncate(24 * time.Hour).AddDate(0, 0, -4).Add(5 * time.Hour)

		// 4 nights with valid durations (240-840 min range)
		// Night 1: 19:00, 600 min (10h), wakes 05:00
		createSleepActivity(t, ctx, store, session.ID, day1.Add(14*time.Hour), 600)
		// Night 2: 20:00, 480 min (8h), wakes 04:00
		createSleepActivity(t, ctx, store, session.ID, day1.Add(24*time.Hour+15*time.Hour), 480)
		// Night 3: 21:00, 540 min (9h), wakes 06:00
		createSleepActivity(t, ctx, store, session.ID, day1.Add(2*24*time.Hour+16*time.Hour), 540)
		// Night 4: 20:00, 480 min (8h), wakes 04:00
		createSleepActivity(t, ctx, store, session.ID, day1.Add(3*24*time.Hour+15*time.Hour), 480)

		from := day1.Add(-1 * time.Hour)
		to := day1.Add(5 * 24 * time.Hour)

		stats, err := store.overnightSleepStats(ctx, family.ID, from, to)
		if err != nil {
			t.Fatalf("overnightSleepStats failed: %v", err)
		}

		if stats.Count != 4 {
			t.Errorf("count = %d, want 4", stats.Count)
		}
		if stats.MedianBedtimeSampleCount != 4 {
			t.Errorf("bedtime sample count = %d, want 4", stats.MedianBedtimeSampleCount)
		}
		if stats.MedianBedtime == nil {
			t.Error("median bedtime should not be nil with 4 samples")
		}
		if stats.MedianWakeTimeSampleCount != 4 {
			t.Errorf("wake time sample count = %d, want 4", stats.MedianWakeTimeSampleCount)
		}
		if stats.MedianWakeTime == nil {
			t.Error("median wake time should not be nil with 4 samples")
		}
	})

	t.Run("outlier excluded from bedtime median but included in totals", func(t *testing.T) {
		family, session := setupFamily(t)
		day1 := time.Now().UTC().Truncate(24 * time.Hour).AddDate(0, 0, -5).Add(5 * time.Hour)

		// 3 normal overnight sleeps at 20:00, each 600 min (10h)
		createSleepActivity(t, ctx, store, session.ID, day1.Add(15*time.Hour), 600)
		createSleepActivity(t, ctx, store, session.ID, day1.Add(24*time.Hour+15*time.Hour), 600)
		createSleepActivity(t, ctx, store, session.ID, day1.Add(2*24*time.Hour+15*time.Hour), 600)
		// 1 outlier: 18:00, 1200 min (20h) — exceeds 840 min cap
		createSleepActivity(t, ctx, store, session.ID, day1.Add(3*24*time.Hour+13*time.Hour), 1200)

		from := day1.Add(-1 * time.Hour)
		to := day1.Add(5 * 24 * time.Hour)

		stats, err := store.overnightSleepStats(ctx, family.ID, from, to)
		if err != nil {
			t.Fatalf("overnightSleepStats failed: %v", err)
		}

		// All 4 counted as overnight
		if stats.Count != 4 {
			t.Errorf("count = %d, want 4", stats.Count)
		}
		// Total includes outlier: 3*600 + 1200 = 3000
		if stats.TotalMinutes != 3000 {
			t.Errorf("total minutes = %d, want 3000", stats.TotalMinutes)
		}
		// Only 3 pass the 240-840 filter
		if stats.MedianBedtimeSampleCount != 3 {
			t.Errorf("bedtime sample count = %d, want 3", stats.MedianBedtimeSampleCount)
		}
		if stats.MedianBedtime == nil {
			t.Error("median bedtime should not be nil with 3 qualifying samples")
		} else if *stats.MedianBedtime != "20:00" {
			t.Errorf("median bedtime = %s, want 20:00", *stats.MedianBedtime)
		}
	})

	t.Run("missing end_time excluded from wake median", func(t *testing.T) {
		family, session := setupFamily(t)
		day1 := time.Now().UTC().Truncate(24 * time.Hour).AddDate(0, 0, -6).Add(5 * time.Hour)

		// 4 overnight sleeps, all valid duration
		createSleepActivity(t, ctx, store, session.ID, day1.Add(15*time.Hour), 480)
		createSleepActivity(t, ctx, store, session.ID, day1.Add(24*time.Hour+15*time.Hour), 480)
		createSleepActivity(t, ctx, store, session.ID, day1.Add(2*24*time.Hour+15*time.Hour), 480)

		// 4th sleep: create manually without end_time
		sleepTime := day1.Add(3*24*time.Hour + 15*time.Hour)
		createSleepActivityNoEndTime(t, ctx, store, session.ID, sleepTime, 480)

		from := day1.Add(-1 * time.Hour)
		to := day1.Add(5 * 24 * time.Hour)

		stats, err := store.overnightSleepStats(ctx, family.ID, from, to)
		if err != nil {
			t.Fatalf("overnightSleepStats failed: %v", err)
		}

		// All 4 pass the duration filter
		if stats.MedianBedtimeSampleCount != 4 {
			t.Errorf("bedtime sample count = %d, want 4", stats.MedianBedtimeSampleCount)
		}
		if stats.MedianBedtime == nil {
			t.Error("median bedtime should not be nil with 4 samples")
		}
		// Only 3 have end_time
		if stats.MedianWakeTimeSampleCount != 3 {
			t.Errorf("wake time sample count = %d, want 3", stats.MedianWakeTimeSampleCount)
		}
		if stats.MedianWakeTime == nil {
			t.Error("median wake time should not be nil with 3 qualifying samples")
		}
	})
}

func TestWakeTimeAdherence(t *testing.T) {
	store, err := NewPostgresStore("postgres://postgres:postgres@localhost:5432/baby_baton_test?sslmode=disable")
	if err != nil {
		t.Fatalf("Failed to connect to database: %v", err)
	}
	defer store.Close()

	ctx := context.Background()

	setupFamily := func(t *testing.T) (*domain.Family, *domain.CareSession) {
		t.Helper()
		family, caregiver, err := CreateTestFamily(ctx, store)
		if err != nil {
			t.Fatalf("Failed to create test family: %v", err)
		}
		t.Cleanup(func() { store.DeleteFamily(ctx, family.ID) })

		session := &domain.CareSession{
			ID:          uuid.New(),
			CaregiverID: caregiver.ID,
			FamilyID:    family.ID,
			Status:      domain.StatusInProgress,
			StartedAt:   time.Now(),
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		}
		if err := store.CreateCareSession(ctx, session); err != nil {
			t.Fatalf("Failed to create session: %v", err)
		}
		return family, session
	}

	t.Run("wake time 5 min off target", func(t *testing.T) {
		family, session := setupFamily(t)
		dayStart := time.Now().UTC().Truncate(24 * time.Hour).Add(5 * time.Hour)

		// Overnight sleep starting at 20:00, ending at 07:05 (665 min)
		createSleepActivity(t, ctx, store, session.ID, dayStart.Add(15*time.Hour), 665)

		from := dayStart.Add(-1 * time.Hour)
		to := dayStart.Add(24 * time.Hour)

		avg, err := store.computeWakeTimeAdherence(ctx, family.ID, from, to, "07:00")
		if err != nil {
			t.Fatalf("computeWakeTimeAdherence failed: %v", err)
		}
		if avg == nil {
			t.Fatal("expected non-nil result")
		}
		if math.Abs(*avg-5) > 1 {
			t.Errorf("got %.1f min, want ~5 min", *avg)
		}
	})

	t.Run("no overnight sleep returns nil", func(t *testing.T) {
		family, session := setupFamily(t)
		dayStart := time.Now().UTC().Truncate(24 * time.Hour).Add(8 * time.Hour)

		// Only a nap at 14:00
		createSleepActivity(t, ctx, store, session.ID, dayStart.Add(6*time.Hour), 30)

		from := dayStart.Add(-1 * time.Hour)
		to := dayStart.Add(24 * time.Hour)
		avg, err := store.computeWakeTimeAdherence(ctx, family.ID, from, to, "07:00")
		if err != nil {
			t.Fatalf("computeWakeTimeAdherence failed: %v", err)
		}
		if avg != nil {
			t.Errorf("expected nil for daytime-only sleep, got %.1f", *avg)
		}
	})

	t.Run("goal adherence includes wake time", func(t *testing.T) {
		family, session := setupFamily(t)
		dayStart := time.Now().UTC().Truncate(24 * time.Hour).Add(5 * time.Hour)

		// Overnight sleep 20:00 -> 07:00 (660 min)
		createSleepActivity(t, ctx, store, session.ID, dayStart.Add(15*time.Hour), 660)

		targetWake := "07:00"
		targetBedtime := "20:00"
		goals := &domain.ScheduleGoals{
			TargetBedtime:  &targetBedtime,
			TargetWakeTime: &targetWake,
		}
		_, err := store.UpsertScheduleGoals(ctx, family.ID, goals)
		if err != nil {
			t.Fatalf("Failed to upsert schedule goals: %v", err)
		}

		from := dayStart.Add(-1 * time.Hour)
		to := dayStart.Add(24 * time.Hour)
		report, err := store.CareReport(ctx, family.ID, from, to, "DAY")
		if err != nil {
			t.Fatalf("CareReport failed: %v", err)
		}

		if report.GoalAdherence == nil {
			t.Fatal("GoalAdherence should not be nil")
		}
		if report.GoalAdherence.WakeTimeAdherenceMinutesAvg == nil {
			t.Error("WakeTimeAdherenceMinutesAvg should not be nil")
		} else if math.Abs(*report.GoalAdherence.WakeTimeAdherenceMinutesAvg) > 1 {
			t.Errorf("WakeTimeAdherenceMinutesAvg = %.1f, want ~0", *report.GoalAdherence.WakeTimeAdherenceMinutesAvg)
		}
	})
}

// Test helpers for creating activity data

func createFeedActivity(t *testing.T, ctx context.Context, store *PostgresStore, sessionID uuid.UUID, feedTime time.Time, amountMl *int, feedType *domain.FeedType) {
	t.Helper()
	activity := &domain.Activity{
		ID:            uuid.New(),
		CareSessionID: sessionID,
		ActivityType:  domain.ActivityTypeFeed,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}
	if err := store.CreateActivity(ctx, activity); err != nil {
		t.Fatalf("Failed to create feed activity: %v", err)
	}

	details := &domain.FeedDetails{
		ID:         uuid.New(),
		ActivityID: activity.ID,
		StartTime:  feedTime,
		AmountMl:   amountMl,
		FeedType:   feedType,
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}
	if err := store.CreateFeedDetails(ctx, details); err != nil {
		t.Fatalf("Failed to create feed details: %v", err)
	}
}

func createDiaperActivity(t *testing.T, ctx context.Context, store *PostgresStore, sessionID uuid.UUID, changedAt time.Time, hadPoop, hadPee bool) {
	t.Helper()
	activity := &domain.Activity{
		ID:            uuid.New(),
		CareSessionID: sessionID,
		ActivityType:  domain.ActivityTypeDiaper,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}
	if err := store.CreateActivity(ctx, activity); err != nil {
		t.Fatalf("Failed to create diaper activity: %v", err)
	}

	details := &domain.DiaperDetails{
		ID:         uuid.New(),
		ActivityID: activity.ID,
		ChangedAt:  changedAt,
		HadPoop:    hadPoop,
		HadPee:     hadPee,
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}
	if err := store.CreateDiaperDetails(ctx, details); err != nil {
		t.Fatalf("Failed to create diaper details: %v", err)
	}
}

func createSleepActivity(t *testing.T, ctx context.Context, store *PostgresStore, sessionID uuid.UUID, startTime time.Time, durationMinutes int) {
	t.Helper()
	activity := &domain.Activity{
		ID:            uuid.New(),
		CareSessionID: sessionID,
		ActivityType:  domain.ActivityTypeSleep,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}
	if err := store.CreateActivity(ctx, activity); err != nil {
		t.Fatalf("Failed to create sleep activity: %v", err)
	}

	endTime := startTime.Add(time.Duration(durationMinutes) * time.Minute)
	details := &domain.SleepDetails{
		ID:              uuid.New(),
		ActivityID:      activity.ID,
		StartTime:       startTime,
		EndTime:         &endTime,
		DurationMinutes: &durationMinutes,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}
	if err := store.CreateSleepDetails(ctx, details); err != nil {
		t.Fatalf("Failed to create sleep details: %v", err)
	}
}

func createSleepActivityNoEndTime(t *testing.T, ctx context.Context, store *PostgresStore, sessionID uuid.UUID, startTime time.Time, durationMinutes int) {
	t.Helper()
	activity := &domain.Activity{
		ID:            uuid.New(),
		CareSessionID: sessionID,
		ActivityType:  domain.ActivityTypeSleep,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}
	if err := store.CreateActivity(ctx, activity); err != nil {
		t.Fatalf("Failed to create sleep activity: %v", err)
	}

	details := &domain.SleepDetails{
		ID:              uuid.New(),
		ActivityID:      activity.ID,
		StartTime:       startTime,
		EndTime:         nil,
		DurationMinutes: &durationMinutes,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}
	if err := store.CreateSleepDetails(ctx, details); err != nil {
		t.Fatalf("Failed to create sleep details: %v", err)
	}
}
