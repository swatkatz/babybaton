# Reporting Feature Design

**Date:** 2026-04-11
**Status:** Draft

## Overview

Add a first-class Reports tab to BabyBaton that gives caregivers aggregate insights into feeding, diaper, and sleep activity. Reports are sliceable by day, week, month, or year, with drill-down from a combined overview into per-activity-type detail screens.

**In scope:**
- New bottom tab "Reports" (5th tab)
- Totals & medians, trends over time, patterns by time of day, goal adherence
- Time range selection: Day / Week / Month / Year (default: rolling 7 days)
- Tappable summary cards with drill-down to per-activity detail screens
- In-app only — no export/sharing in MVP

**Out of scope:**
- PDF/CSV/image export (future)
- Caregiver-specific breakdowns (who logged what)
- Custom date range picker (preset slices only)
- Per-session drill-down from reports (use History tab for that)

## GraphQL API

One new query with supporting types added to `schema.graphql`:

```graphql
enum ReportGranularity {
  DAY
  WEEK
  MONTH
}

type Query {
  careReport(
    from: DateTime!
    to: DateTime!
    granularity: ReportGranularity!
  ): CareReport!
}

type CareReport {
  from: DateTime!
  to: DateTime!
  granularity: ReportGranularity!
  totals: ReportTotals!
  buckets: [ReportBucket!]!
  hourlyPattern: [HourlyBucket!]!
  goalAdherence: GoalAdherence
}

type ReportTotals {
  totalFeeds: Int!
  totalMl: Int!
  medianFeedsPerDay: Float!
  medianMlPerDay: Float!
  feedTypeBreakdown: [FeedTypeCount!]!
  totalDiaperChanges: Int!
  totalPoops: Int!
  totalPees: Int!
  medianDiapersPerDay: Float!
  totalSleepMinutes: Int!
  medianSleepMinutesPerDay: Float!
  medianLongestStretchMinutes: Float!
}

type ReportBucket {
  bucketStart: DateTime!
  feeds: Int!
  ml: Int!
  diapers: Int!
  sleepMinutes: Int!
}

type HourlyBucket {
  hour: Int!
  feeds: Int!
  sleepMinutes: Int!
  diapers: Int!
}

type GoalAdherence {
  wakeWindowAdherencePct: Float
  feedIntervalAdherencePct: Float
  napCountAdherencePct: Float
  bedtimeAdherenceMinutesAvg: Float
}

type FeedTypeCount {
  feedType: FeedType!
  count: Int!
}
```

Note: `ReportTotals` includes a `feedTypeBreakdown: [FeedTypeCount!]!` field for the feed detail screen's type breakdown bar. The frontend hides any segment where `count / totalFeeds < 0.01`.

**Key decisions:**
- No `YEAR` granularity enum — year view uses `MONTH` granularity with a 12-month range.
- `goalAdherence` is null when no `ScheduleGoals` exist for the family.
- `from`/`to` are sent as UTC timestamps, pre-aligned to local midnight by the frontend. The backend does not need to interpret timezones.

## Backend Architecture

### Store Layer

New method on the `Store` interface:

```go
CareReport(ctx context.Context, familyID string, from, to time.Time, granularity string) (*domain.CareReport, error)
```

### Postgres Implementation

New file: `store/postgres/report.go`

Three SQL queries per report call, one per activity type. Each joins through to the detail table for the real activity time:

**Feed buckets:**
```sql
SELECT date_trunc($1, fd.start_time) AS bucket,
       count(*) AS feeds,
       coalesce(sum(fd.amount_ml), 0) AS ml
FROM activities a
JOIN care_sessions cs ON a.care_session_id = cs.id
JOIN feed_details fd ON fd.activity_id = a.id
WHERE cs.family_id = $2
  AND fd.start_time BETWEEN $3 AND $4
  AND a.activity_type = 'feed'
GROUP BY bucket
ORDER BY bucket;
```

**Diaper buckets:**
```sql
SELECT date_trunc($1, dd.changed_at) AS bucket,
       count(*) AS diapers,
       count(*) FILTER (WHERE dd.had_poop) AS poops,
       count(*) FILTER (WHERE dd.had_pee) AS pees
FROM activities a
JOIN care_sessions cs ON a.care_session_id = cs.id
JOIN diaper_details dd ON dd.activity_id = a.id
WHERE cs.family_id = $2
  AND dd.changed_at BETWEEN $3 AND $4
  AND a.activity_type = 'diaper'
GROUP BY bucket
ORDER BY bucket;
```

**Sleep buckets:**
```sql
SELECT date_trunc($1, sd.start_time) AS bucket,
       count(*) AS sleeps,
       coalesce(sum(sd.duration_minutes), 0) AS sleep_minutes
FROM activities a
JOIN care_sessions cs ON a.care_session_id = cs.id
JOIN sleep_details sd ON sd.activity_id = a.id
WHERE cs.family_id = $2
  AND sd.start_time BETWEEN $3 AND $4
  AND a.activity_type = 'sleep'
GROUP BY bucket
ORDER BY bucket;
```

**Hourly histogram (feeds):**
```sql
SELECT extract(hour FROM fd.start_time)::int AS hour,
       count(*) AS feeds
FROM activities a
JOIN care_sessions cs ON a.care_session_id = cs.id
JOIN feed_details fd ON fd.activity_id = a.id
WHERE cs.family_id = $1
  AND fd.start_time BETWEEN $2 AND $3
  AND a.activity_type = 'feed'
GROUP BY hour
ORDER BY hour;
```

**Hourly histogram (diapers):**
```sql
SELECT extract(hour FROM dd.changed_at)::int AS hour,
       count(*) AS diapers
FROM activities a
JOIN care_sessions cs ON a.care_session_id = cs.id
JOIN diaper_details dd ON dd.activity_id = a.id
WHERE cs.family_id = $1
  AND dd.changed_at BETWEEN $2 AND $3
  AND a.activity_type = 'diaper'
GROUP BY hour
ORDER BY hour;
```

**Hourly histogram (sleep):**
```sql
SELECT extract(hour FROM sd.start_time)::int AS hour,
       coalesce(sum(sd.duration_minutes), 0) AS sleep_minutes
FROM activities a
JOIN care_sessions cs ON a.care_session_id = cs.id
JOIN sleep_details sd ON sd.activity_id = a.id
WHERE cs.family_id = $1
  AND sd.start_time BETWEEN $2 AND $3
  AND a.activity_type = 'sleep'
GROUP BY hour
ORDER BY hour;
```

**Median computations (feeds per day example):**

Medians require a two-step aggregation — first compute daily totals, then take the median across days:

```sql
SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY daily_feeds) AS median_feeds_per_day,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY daily_ml) AS median_ml_per_day
FROM (
  SELECT date_trunc('day', fd.start_time) AS day,
         count(*) AS daily_feeds,
         coalesce(sum(fd.amount_ml), 0) AS daily_ml
  FROM activities a
  JOIN care_sessions cs ON a.care_session_id = cs.id
  JOIN feed_details fd ON fd.activity_id = a.id
  WHERE cs.family_id = $1
    AND fd.start_time BETWEEN $2 AND $3
    AND a.activity_type = 'feed'
  GROUP BY day
) daily_totals;
```

**Median diapers per day:**
```sql
SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY daily_diapers) AS median_diapers_per_day
FROM (
  SELECT date_trunc('day', dd.changed_at) AS day,
         count(*) AS daily_diapers
  FROM activities a
  JOIN care_sessions cs ON a.care_session_id = cs.id
  JOIN diaper_details dd ON dd.activity_id = a.id
  WHERE cs.family_id = $1
    AND dd.changed_at BETWEEN $2 AND $3
    AND a.activity_type = 'diaper'
  GROUP BY day
) daily_totals;
```

**Median sleep per day + median longest stretch:**
```sql
SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY daily_sleep) AS median_sleep_minutes_per_day,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY longest_stretch) AS median_longest_stretch_minutes
FROM (
  SELECT date_trunc('day', sd.start_time) AS day,
         coalesce(sum(sd.duration_minutes), 0) AS daily_sleep,
         max(sd.duration_minutes) AS longest_stretch
  FROM activities a
  JOIN care_sessions cs ON a.care_session_id = cs.id
  JOIN sleep_details sd ON sd.activity_id = a.id
  WHERE cs.family_id = $1
    AND sd.start_time BETWEEN $2 AND $3
    AND a.activity_type = 'sleep'
  GROUP BY day
) daily_totals;
```

**Goal adherence:** Computed in Go by:
1. Loading the family's `ScheduleGoals` (if none, return nil)
2. Querying consecutive feed times and sleep times in the range
3. Computing actual intervals using `LAG()` window function:

```sql
-- Feed intervals (for feed interval adherence)
SELECT feed_interval_minutes
FROM (
  SELECT extract(epoch FROM (fd.start_time - LAG(fd.start_time) OVER (ORDER BY fd.start_time))) / 60
         AS feed_interval_minutes
  FROM activities a
  JOIN care_sessions cs ON a.care_session_id = cs.id
  JOIN feed_details fd ON fd.activity_id = a.id
  WHERE cs.family_id = $1
    AND fd.start_time BETWEEN $2 AND $3
    AND a.activity_type = 'feed'
) intervals
WHERE feed_interval_minutes IS NOT NULL;
```

4. In Go: compare each interval against `targetFeedIntervalMinutes`, compute percentage within tolerance
5. Nap count adherence: count sleeps per day, compare against `targetNapCount`
6. Bedtime adherence: extract sleep start times, compare against `targetBedtime`, compute average minutes off

### Feed Type Breakdown

For the detail screen, a supplementary query returns feed counts grouped by `feed_type`:

```sql
SELECT fd.feed_type, count(*) AS cnt
FROM activities a
JOIN care_sessions cs ON a.care_session_id = cs.id
JOIN feed_details fd ON fd.activity_id = a.id
WHERE cs.family_id = $1
  AND fd.start_time BETWEEN $2 AND $3
  AND a.activity_type = 'feed'
GROUP BY fd.feed_type;
```

This powers the `TypeBreakdownBar`. The frontend hides any segment representing <1% of total feeds — this prevents misleading slivers for families that primarily use one feed type.

### Parallel Query Execution

Report queries are independent per activity type and must run concurrently. A thin helper using `errgroup` provides this:

```go
// internal/parallel/parallel.go
package parallel

import (
    "context"
    "golang.org/x/sync/errgroup"
)

// Run executes functions concurrently, returning on first error.
// Remaining functions are cancelled via context on failure.
func Run(ctx context.Context, fns ...func(ctx context.Context) error) error {
    g, ctx := errgroup.WithContext(ctx)
    for _, fn := range fns {
        g.Go(func() error { return fn(ctx) })
    }
    return g.Wait()
}
```

The report store method uses this to run all four work streams in parallel:

```go
func (s *PostgresStore) CareReport(ctx context.Context, familyID string, from, to time.Time, granularity string) (*domain.CareReport, error) {
    var feedResult feedData
    var diaperResult diaperData
    var sleepResult sleepData
    var goals *domain.ScheduleGoals

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
    )
    if err != nil {
        return nil, err
    }
    // Merge results + compute goal adherence...
}
```

Each per-type method (`feedReport`, `diaperReport`, `sleepReport`) internally runs its CTE query (buckets + medians + hourly combined) as a single SQL round-trip. Wall-clock time equals the slowest single activity-type query rather than the sum.

**Follow-up (after reporting ships):** The same `parallel.Run` helper should be retrofitted onto existing sequential resolvers:
- **Predictions resolver** (`schema.resolvers.go:1231-1270`): `GetRecentFeedDetailsForFamily` + `GetRecentSleepDetailsForFamily` + `GetScheduleGoals` — all independent
- **GetBabyStatus resolver** (`schema.resolvers.go:1088-1140`): 3x `GetLatestActivityByType` in first tier, 3x `GetDetails` in second tier — both tiers parallelizable
- **AddActivities / CompleteCareSession**: loop of `GetSleepDetails` + `UpdateSleepDetails` — per-iteration parallelizable

### CTE Consolidation

Each per-type method combines its bucket, hourly, and median queries into a single SQL round-trip using a CTE. Example for feeds:

```sql
WITH daily AS (
  SELECT date_trunc('day', fd.start_time) AS day,
         count(*) AS feeds,
         coalesce(sum(fd.amount_ml), 0) AS ml
  FROM activities a
  JOIN care_sessions cs ON a.care_session_id = cs.id
  JOIN feed_details fd ON fd.activity_id = a.id
  WHERE cs.family_id = $1
    AND fd.start_time BETWEEN $2 AND $3
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
    AND fd.start_time BETWEEN $2 AND $3
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
ORDER BY result_type, key;
```

Go code parses the tagged rows into the appropriate structs. This reduces each activity type from 3 round-trips to 1.

**Total query count per report:** 4 concurrent round-trips (feed CTE + diaper CTE + sleep CTE + schedule goals), plus 1 sequential feed type breakdown query. Wall time ≈ slowest single CTE (~5-10ms even at year scale).

### Domain Models

New structs in `domain/models.go`: `CareReport`, `ReportTotals`, `ReportBucket`, `HourlyBucket`, `GoalAdherence`.

### Mapper

New mapping functions in `mapper/` to convert domain structs to GraphQL types.

### Resolver

Thin resolver in `schema.resolvers.go`: extracts `familyID` from context, parses arguments, calls `store.CareReport()`, maps result.

### Migration

```sql
-- 009_add_report_index.sql
CREATE INDEX idx_care_sessions_family_started
  ON care_sessions(family_id, started_at);
```

Existing indexes on `feed_details(start_time)`, `diaper_details(changed_at)`, and `sleep_details(start_time)` already cover the detail-table side of the joins.

### Activity Time Note

`activities.created_at` is the row insertion time, NOT when the activity happened. All report queries must use the actual activity time from the detail tables:
- `feed_details.start_time`
- `diaper_details.changed_at`
- `sleep_details.start_time`

## Frontend Architecture

### Navigation

Add `ReportsTab` as a 5th bottom tab in `MainTabNavigator`:

```
Tab: Home | History | Reports | Schedule | Profile
```

New `ReportsStack` with two screens:
- `ReportsOverview` — the landing page
- `ReportDetail` — per-activity-type detail, receives `activityType` as route param

New param list type:

```typescript
export type ReportsStackParamList = {
  ReportsOverview: undefined;
  ReportDetail: { activityType: 'FEED' | 'DIAPER' | 'SLEEP' };
};
```

Tab icon: `BarChart3` from `lucide-react-native` (consistent with existing icon set).

### ReportsOverview Screen

**Layout (scrollable single page):**
1. **Time range chips** — Day / Week / Month / Year, sticky at top. Default: Week (rolling 7 days).
2. **Summary cards** — Three tappable cards in a row (Feed, Diaper, Sleep). Each shows total count, primary metric, and daily median. Blue border + chevron to indicate tappability. Tapping navigates to `ReportDetail`.
3. **Trends section** — Bar chart showing combined daily/weekly/monthly buckets. Uses the `buckets` from the API. Color-coded by activity type.
4. **Daily pattern section** — 24-bar histogram from `hourlyPattern`. Color-coded bars (blue=feed, purple=sleep, peach=diaper).
5. **Goal adherence section** — Progress bars with percentages. Only shown when `goalAdherence` is non-null.

**Time range computation (frontend):**
- Day: today midnight → tomorrow midnight (local), sent as UTC
- Week: 7 days ago midnight → today midnight (local), sent as UTC
- Month: 30 days ago midnight → today midnight (local), sent as UTC
- Year: 365 days ago midnight → today midnight (local), sent as UTC

Granularity mapping:
- Day → `DAY` (1 bucket)
- Week → `DAY` (7 buckets)
- Month → `DAY` (30 buckets)
- Year → `MONTH` (12 buckets)

### ReportDetail Screen

Pushed onto the `ReportsStack` with a back button. Header shows activity icon + "Feeding Report" / "Sleep Report" / "Diaper Report".

**Layout (scrollable):**
1. **Time range chips** — same as overview, stays in sync
2. **Detailed stats** — 3 stat cards specific to the type:
   - Feed: total feeds, median/day, median ml/day
   - Sleep: total hours, median/day, median longest stretch
   - Diaper: total changes, poops, pees
3. **Type breakdown bar** (feed only) — horizontal stacked bar showing breast milk / formula / solids proportions. Segments <1% are hidden.
4. **Trend chart** — type-specific bar chart (feeds/day, sleep minutes/day, diapers/day)
5. **Hourly pattern** — 24-bar histogram filtered to this activity type
6. **Goal adherence** — relevant goal for this type only (e.g., feed interval for feeds, nap count for sleep). Hidden if no goals set.

### New Components

| Component | Purpose |
|-----------|---------|
| `TimeRangeChips` | Day/Week/Month/Year selector, shared between screens |
| `SummaryCard` | Tappable stat card with icon, value, label, subtitle, chevron |
| `TrendChart` | Bar chart wrapping `react-native-gifted-charts` `BarChart` |
| `HourlyPatternChart` | 24-bar histogram wrapping `react-native-gifted-charts` `BarChart` |
| `GoalAdherenceBar` | Progress bar with label and percentage |
| `TypeBreakdownBar` | Horizontal stacked bar for feed type proportions, hides <1% segments |

### Charting Library

`react-native-gifted-charts` — lightweight, good defaults for bar charts and histograms, built on `react-native-svg` (already a dependency via `lucide-react-native`). Works on iOS, Android, and Web.

### GraphQL

New query document in `src/graphql/queries/`:

```graphql
query GetCareReport($from: DateTime!, $to: DateTime!, $granularity: ReportGranularity!) {
  careReport(from: $from, to: $to, granularity: $granularity) {
    from
    to
    granularity
    totals {
      totalFeeds
      totalMl
      medianFeedsPerDay
      medianMlPerDay
      totalDiaperChanges
      totalPoops
      totalPees
      medianDiapersPerDay
      totalSleepMinutes
      medianSleepMinutesPerDay
      medianLongestStretchMinutes
    }
    buckets {
      bucketStart
      feeds
      ml
      diapers
      sleepMinutes
    }
    hourlyPattern {
      hour
      feeds
      sleepMinutes
      diapers
    }
    goalAdherence {
      wakeWindowAdherencePct
      feedIntervalAdherencePct
      napCountAdherencePct
      bedtimeAdherenceMinutesAvg
    }
  }
}
```

After adding this, run `npx graphql-codegen --config codegen.ts` to generate types.

### Feed Type Breakdown Data

The `careReport` API returns aggregate data but not per-feed-type breakdown. For the detail screen, options:

1. **Add a `feedTypeBreakdown` field** to `ReportTotals` (e.g., `feedTypeBreakdown: [FeedTypeCount!]`)
2. **Compute from a separate query** that returns raw feed type counts

Option 1 is cleaner — add to the schema:

```graphql
type FeedTypeCount {
  feedType: FeedType!
  count: Int!
}

type ReportTotals {
  # ... existing fields ...
  feedTypeBreakdown: [FeedTypeCount!]!
}
```

The backend populates this from the feed type grouping query. The frontend filters out entries where `count / totalFeeds < 0.01`.

## Testing Strategy

### Backend

**Store integration tests** (`store/postgres/report_test.go`):
- Seed activities with known times across feed_details, diaper_details, sleep_details
- Test DAY, WEEK, MONTH granularities
- Assert bucket counts, totals, medians, hourly histogram values
- Edge cases: empty date ranges, single activity, activities at midnight boundaries
- Feed type breakdown: verify counts, test that all types are returned (frontend handles <1% filtering)

**Goal adherence tests:**
- Seed activities with known intervals + set schedule goals → verify percentages
- No goals set → verify nil adherence returned
- Partial goals (only some fields set) → verify only relevant percentages computed

**Resolver test:**
- Verify wiring: correct store method called with correct arguments, result mapped properly

### Frontend

**ReportsScreen tests:**
- Mock `GetCareReport` query
- Verify 3 summary cards render with correct values
- Verify time range chip selection triggers refetch with correct `from`/`to`/`granularity`
- Verify tapping a summary card navigates to `ReportDetail` with correct `activityType`
- Verify goal adherence section hidden when `goalAdherence` is null

**ReportDetailScreen tests:**
- Mock query with `activityType` param
- Verify type-specific stats render
- Verify `TypeBreakdownBar` renders for feed type, hidden for others
- Verify <1% segments are filtered out of breakdown bar

**Component tests:**
- `TimeRangeChips`: selection state, callback fired with correct range
- `SummaryCard`: renders values, tappable, shows chevron
- `TypeBreakdownBar`: hides segments <1%, renders remaining segments proportionally
- `GoalAdherenceBar`: renders percentage, handles null gracefully

**Typecheck:**
- `npm run typecheck` must pass with all new codegen types

### Not Tested

- Chart rendering internals (victory/gifted-charts responsibility)
- Visual pixel accuracy (no snapshot tests for charts)
- Cross-platform chart rendering differences
