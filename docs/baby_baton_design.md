# Baby Baton App - Technical Design Document (MVP)

## 1. System Overview

### 1.1 Purpose

A multi-caregiver baby tracking system with voice input for seamless care transitions, smart feed predictions, and local notifications. The app is called "Baby Baton" - representing the passing of care responsibility between caregivers.

Baby Baton supports multiple families, where each family has one baby and multiple caregivers who can track care activities together.

### 1.2 MVP Scope

**In Scope:**

- Multi-family support with password-based access
- Family creation and joining with unique family names
- Single baby per family with customizable name
- Caregiver management (all caregivers have equal permissions)
- Care session management (start, add activities, complete)
- Voice input with button confirmation
- Manual activity entry as fallback when voice fails
- Edit and delete activities in current session
- Track: Feeds, Diaper changes, Sleep
- Display last 3-4 completed care sessions + current in-progress session
- Smart rule-based feed predictions
- Local push notifications (15 min before predicted feed)
- Leave family functionality
- Family settings (view password, caregiver list, baby name)
- Responsive UI for all phone sizes
- Cross-platform: iOS, Android, Web

**Out of Scope (Post-MVP):**

- Analytics/trends dashboard
- Play activity tracking (use notes field instead)
- Baby metrics (weight, height, milestones)
- ML-based predictions
- Cloud push notifications
- Multi-baby support (only one baby per family)
- Caregiver roles/permissions (all caregivers are admins)
- QR code family joining
- Email/cloud authentication
- Multi-device per caregiver (one device = one family membership)

### 1.3 Architecture Diagram

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   iOS Device    │  │ Android Device  │  │   Web Browser   │
│  (React Native) │  │ (React Native)  │  │  (Expo Web)     │
│                 │  │                 │  │                 │
│  • Voice Input  │  │  • Voice Input  │  │  • Voice Input  │
│  • Manual Entry │  │  • Manual Entry │  │  • Manual Entry │
│  • Predictions  │  │  • Predictions  │  │  • Predictions  │
│  • Family Auth  │  │  • Family Auth  │  │  • Family Auth  │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                    │                     │
         │    GraphQL over HTTPS                    │
         │    Polls: 10s (current), 30s (recent)    │
         └──────────┬─────────────┬─────────────────┘
                    │             │
         ┌──────────▼──────────┐  │
         │   Go GraphQL Server │  │
         │   (gqlgen - :8080)  │  │
         │   Deployed: Railway │  │
         └──────────┬──────────┘  │
                    │             │
         ┌──────────▼──────────┐  │
         │   Business Logic    │  │
         │   - Family Auth     │  │
         │   - Session Mgmt    │  │
         │   - Voice Parsing   │  │
         │   - Predictions     │  │
         └──┬──────────────┬───┘  │
            │              │      │
┌───────────▼───┐  ┌───────▼──────▼───┐
│  OpenAI API   │  │   Claude API     │
│  (Whisper     │  │   (Voice Text    │
│  Transcribe)  │  │    Parsing)      │
└───────────────┘  └──────────────────┘
                    │
         ┌──────────▼──────────┐
         │   PostgreSQL        │
         │   (Docker local /   │
         │    Railway prod)    │
         └─────────────────────┘
```

### 1.4 Technology Stack

- **Backend:** Go 1.25+
- **API:** GraphQL (gqlgen)
- **Database:** PostgreSQL 15+
- **Frontend:** React Native (Expo SDK 54) + TypeScript
- **GraphQL Client:** Apollo Client v4
- **Voice:** Device audio recording → OpenAI Whisper API (transcription) → Claude API (parsing into structured activities)
- **Manual Entry:** ManualEntryModal as fallback when voice input fails
- **Password Hashing:** bcrypt
- **Containerization:** Docker + Docker Compose (local PostgreSQL)
- **Deployment:** Railway (backend + frontend web), EAS (native iOS/Android builds)
- **CI/CD:** GitHub Actions
- **Navigation:** React Navigation v7
- **Repository:** GitHub (monorepo)

---

## 2. Database Schema

### 2.1 Tables (MVP)

#### `families`

```sql
CREATE TABLE families (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    baby_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT families_name_unique UNIQUE (name)
);

-- Case-insensitive lookup for family names
CREATE UNIQUE INDEX idx_families_name_lower ON families(LOWER(name));
```

**Note:** A `password` column (VARCHAR(100)) was added in migration 002 to store the plain-text password for display in settings. The `password_hash` stores the bcrypt hash for verification.

#### `caregivers`

```sql
CREATE TABLE caregivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    device_id VARCHAR(255) NOT NULL,
    device_name VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Device can only belong to one family at a time
CREATE UNIQUE INDEX idx_caregivers_device_id ON caregivers(device_id);

-- Index for family lookups
CREATE INDEX idx_caregivers_family_id ON caregivers(family_id);
```

#### `care_sessions`

```sql
CREATE TABLE care_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caregiver_id UUID NOT NULL REFERENCES caregivers(id) ON DELETE CASCADE,
    family_id UUID NOT NULL REFERENCES families(id),
    status VARCHAR(20) NOT NULL CHECK (status IN ('in_progress', 'completed')),
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_care_sessions_status ON care_sessions(status);
CREATE INDEX idx_care_sessions_caregiver ON care_sessions(caregiver_id);
CREATE INDEX idx_care_sessions_family ON care_sessions(family_id);
CREATE INDEX idx_care_sessions_started_at ON care_sessions(started_at DESC);
CREATE INDEX idx_care_sessions_family_status ON care_sessions(family_id, status);
```

**Note:** `caregiver_id` has `ON DELETE CASCADE` (migration 003) — when a caregiver leaves, their sessions and all cascading activities/details are deleted.

#### `activities`

```sql
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    care_session_id UUID NOT NULL REFERENCES care_sessions(id) ON DELETE CASCADE,
    activity_type VARCHAR(20) NOT NULL CHECK (activity_type IN ('feed', 'diaper', 'sleep')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activities_session ON activities(care_session_id);
CREATE INDEX idx_activities_type ON activities(activity_type);
CREATE INDEX idx_activities_created_at ON activities(created_at DESC);
```

#### `feed_details`

```sql
CREATE TABLE feed_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    amount_ml INTEGER CHECK (amount_ml > 0),
    feed_type VARCHAR(20) CHECK (feed_type IN ('breast_milk', 'formula')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_feed_details_activity ON feed_details(activity_id);
CREATE INDEX idx_feed_details_start_time ON feed_details(start_time DESC);
```

#### `diaper_details`

```sql
CREATE TABLE diaper_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    changed_at TIMESTAMP NOT NULL,
    had_poop BOOLEAN NOT NULL DEFAULT false,
    had_pee BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_diaper_details_activity ON diaper_details(activity_id);
CREATE INDEX idx_diaper_details_changed_at ON diaper_details(changed_at DESC);
```

#### `sleep_details`

```sql
CREATE TABLE sleep_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    duration_minutes INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sleep_details_activity ON sleep_details(activity_id);
CREATE INDEX idx_sleep_details_start_time ON sleep_details(start_time DESC);
```

### 2.2 Notes on Schema

- **Family Isolation:** All data is scoped to family_id for data isolation
- **Cascading Deletes:**
  - When family is deleted: All caregivers, sessions, and activities are removed
  - When caregiver leaves (deleted): Their sessions and cascading activities/details are deleted (ON DELETE CASCADE, migration 003)
  - When care_session is deleted: All activities and their details are removed
- **Device Uniqueness:** One device can only be in one family at a time
- **Family Name:** Case-insensitive unique constraint for easy joining
- **Timestamps:** All tables have created_at/updated_at for audit trail

### 2.3 Migrations

```
migrations/
├── 001_init_schema.sql                    # Core tables, indexes, triggers
├── 002_add_password_to_families.sql       # Plain-text password column for settings display
└── 003_cascade_delete_caregiver_sessions.sql  # ON DELETE CASCADE for caregiver sessions
```

---

## 3. GraphQL Schema (MVP)

```graphql
scalar DateTime
scalar Upload

# Enums
enum CareSessionStatus {
  IN_PROGRESS
  COMPLETED
}

enum ActivityType {
  FEED
  DIAPER
  SLEEP
}

enum FeedType {
  BREAST_MILK
  FORMULA
}

enum PredictionConfidence {
  HIGH
  MEDIUM
  LOW
}

# Types
type Family {
  id: ID!
  name: String!
  babyName: String!
  password: String!
  caregivers: [Caregiver!]!
  createdAt: DateTime!
}

type Caregiver {
  id: ID!
  familyId: ID!
  name: String!
  deviceId: String!
  deviceName: String
  createdAt: DateTime!
}

type CareSession {
  id: ID!
  caregiver: Caregiver!
  familyId: ID!
  status: CareSessionStatus!
  startedAt: DateTime!
  completedAt: DateTime
  activities: [Activity!]!
  notes: String
  summary: CareSessionSummary!
}

type CareSessionSummary {
  totalFeeds: Int!
  totalMl: Int!
  totalDiaperChanges: Int!
  totalSleepMinutes: Int!
  lastFeedTime: DateTime
  lastSleepTime: DateTime
  currentlyAsleep: Boolean!
}

union Activity = FeedActivity | DiaperActivity | SleepActivity

type FeedDetails {
  startTime: DateTime!
  endTime: DateTime
  amountMl: Int
  feedType: FeedType
  durationMinutes: Int
}

type DiaperDetails {
  changedAt: DateTime!
  hadPoop: Boolean!
  hadPee: Boolean!
}

type SleepDetails {
  startTime: DateTime!
  endTime: DateTime
  durationMinutes: Int
  isActive: Boolean
}

type FeedActivity {
  id: ID!
  activityType: ActivityType!
  createdAt: DateTime!
  feedDetails: FeedDetails
}

type DiaperActivity {
  id: ID!
  activityType: ActivityType!
  createdAt: DateTime!
  diaperDetails: DiaperDetails
}

type SleepActivity {
  id: ID!
  activityType: ActivityType!
  createdAt: DateTime!
  sleepDetails: SleepDetails
}

type NextFeedPrediction {
  predictedTime: DateTime!
  confidence: PredictionConfidence!
  reasoning: String
  minutesUntilFeed: Int!
}

# Separate output type for parsed voice results (no id/createdAt)
type ParsedActivity {
  activityType: ActivityType!
  feedDetails: FeedDetails
  diaperDetails: DiaperDetails
  sleepDetails: SleepDetails
}

type ParsedVoiceResult {
  success: Boolean!
  parsedActivities: [ParsedActivity!]!
  errors: [String!]
  rawText: String!
}

type AuthResult {
  success: Boolean!
  family: Family
  caregiver: Caregiver
  error: String
}

# Inputs
input ActivityInput {
  activityType: ActivityType!
  feedDetails: FeedDetailsInput
  diaperDetails: DiaperDetailsInput
  sleepDetails: SleepDetailsInput
}

input FeedDetailsInput {
  startTime: DateTime!
  endTime: DateTime
  amountMl: Int
  feedType: FeedType
}

input DiaperDetailsInput {
  changedAt: DateTime!
  hadPoop: Boolean!
  hadPee: Boolean
}

input SleepDetailsInput {
  startTime: DateTime!
  endTime: DateTime
}

# Queries
type Query {
  # Family & Auth
  checkFamilyNameAvailable(name: String!): Boolean!
  getMyFamily: Family
  getMyCaregiver: Caregiver

  # Care Sessions (automatically scoped to authenticated caregiver's family)
  getRecentCareSessions(limit: Int): [CareSession!]!
  getCurrentSession: CareSession
  getCareSession(id: ID!): CareSession

  # Predictions
  predictNextFeed: NextFeedPrediction!
}

# Mutations
type Mutation {
  # Family Management
  createFamily(
    familyName: String!
    password: String!
    babyName: String!
    caregiverName: String!
    deviceId: String!
    deviceName: String
  ): AuthResult!

  joinFamily(
    familyName: String!
    password: String!
    caregiverName: String!
    deviceId: String!
    deviceName: String
  ): AuthResult!

  updateBabyName(babyName: String!): Family!

  leaveFamily: Boolean!

  # Care Session Management
  startCareSession: CareSession!

  parseVoiceInput(audioFile: Upload!): ParsedVoiceResult!

  addActivities(activities: [ActivityInput!]!): CareSession!

  endActivity(activityId: ID!, endTime: DateTime): Activity!

  completeCareSession(notes: String): CareSession!

  deleteActivity(activityId: ID!): Boolean!

  updateActivity(activityId: ID!, input: ActivityInput!): Activity!
}
```

### 3.1 Key Design Decisions

**Family Isolation:**

- All queries automatically scope to the caregiver's family
- No cross-family data access possible
- Family membership required for all operations

**Authentication Flow:**

- Device-based authentication (deviceId stored after family join/create)
- Headers sent on every request: `X-Family-ID`, `X-Caregiver-ID`, `X-Timezone`
- Password hashed with bcrypt
- Family name is case-insensitive
- Password shown in plain text in settings (for easy sharing)

**JoinFamily — Three-Case Handling:**

- **Same device, same family:** Re-authenticates (returns existing caregiver)
- **Same device, different family:** Blocks with error ("Device already belongs to a family")
- **New device:** Creates new caregiver in the family

**Single Active Session:**

- Only ONE in-progress session allowed per family at a time
- Enforced in application logic
- When new session starts: Auto-completes previous session (if exists) with current timestamp
- **Handoff logic:** When a different caregiver adds activities via `addActivities`, the existing session auto-completes (active sleeps auto-ended) and a new session is created for the new caregiver

**Activity Recording Rules:**

- **Feed Activities:**
  - Required: start_time, amount_ml, feed_type
  - End time: User-provided OR auto-calculated as `start_time + 45 minutes`
  - Example: "Fed 60ml at 2pm" → 2:00pm - 2:45pm (default)
  - Example: "Fed 60ml from 2pm to 2:20pm" → 2:00pm - 2:20pm (user-provided)
  - Can be edited via `updateActivity` mutation in current session
- **Diaper Activities:**
  - Required: timestamp, had_poop, had_pee
  - Instant activity, no duration
  - Can be edited via `updateActivity` mutation in current session
- **Sleep Activities:**
  - Required: start_time
  - End time: Optional (null = ongoing/active)
  - Only ONE incomplete sleep allowed per session
  - Can be ended via `endActivity` mutation (Mark as Awake button)
  - Auto-ended when session completes
  - Can be edited via `updateActivity` mutation in current session

**Session Completion:**

- Manual: User clicks "Complete Care Session" → Auto-ends any active sleep
- Automatic: New session starts → Previous session auto-completes → Active sleep auto-ended
- Automatic handoff: Different caregiver adds activities → Previous session auto-completes

**Leave Family:**

- Deletes caregiver record
- Device becomes available to join another family
- Sessions and activities created by that caregiver are cascade-deleted (ON DELETE CASCADE)

---

## 4. Smart Feed Prediction Algorithm

> **Status: NOT YET IMPLEMENTED.** The `predictNextFeed` query currently returns mock data (2 hours from now, HIGH confidence, static reasoning string). The algorithm below is the planned design.

### 4.1 Rule-Based Prediction Engine

```go
type PredictionFactors struct {
    LastFeedTime      time.Time
    LastFeedAmountMl  int
    IsCurrentlySleeping bool
    SleepStartTime    time.Time
    TimeOfDay         int  // Hour of day (0-23)
    RecentFeedIntervals []time.Duration  // Last 5 intervals
}

func PredictNextFeed(factors PredictionFactors) NextFeedPrediction {
    // 1. Calculate base interval from recent history
    avgInterval := calculateAverageInterval(factors.RecentFeedIntervals)

    // 2. Adjust for amount consumed
    amountAdjustment := calculateAmountAdjustment(factors.LastFeedAmountMl)

    // 3. Adjust for time of day
    timeOfDayAdjustment := calculateTimeOfDayAdjustment(factors.TimeOfDay)

    // 4. Adjust for sleep state
    sleepAdjustment := calculateSleepAdjustment(
        factors.IsCurrentlySleeping,
        factors.SleepStartTime
    )

    // 5. Combine adjustments
    finalInterval := avgInterval + amountAdjustment + timeOfDayAdjustment + sleepAdjustment

    // 6. Calculate confidence
    confidence := calculateConfidence(factors)

    // 7. Generate reasoning
    reasoning := generateReasoning(factors, finalInterval)

    return NextFeedPrediction{
        PredictedTime: factors.LastFeedTime.Add(finalInterval),
        Confidence: confidence,
        Reasoning: reasoning,
    }
}
```

### 4.2 Adjustment Rules

#### Amount-Based Adjustment

```
< 50ml  → -30 minutes (hungry sooner)
50-70ml → -15 minutes
70-90ml → no adjustment (baseline)
> 90ml  → +30 minutes (full belly)
```

#### Time-of-Day Adjustment

```
Daytime (6am - 10pm):
  - Standard 3-hour baseline

Night (10pm - 6am):
  - First night feed: +1 hour (cluster feed pattern)
  - After midnight: +2 hours (longer stretch)
  - Early morning (4-6am): -30 min (hungry before wake)
```

#### Sleep-State Adjustment

```
If currently sleeping:
  - Sleep < 1 hour: no adjustment
  - Sleep 1-3 hours: +30 minutes
  - Sleep 3-6 hours: +1 hour
  - Sleep > 6 hours: don't adjust (will wake when ready)

If just woke up (< 15 min ago):
  - -15 minutes (hungry after nap)
```

### 4.3 Confidence Calculation

```go
func calculateConfidence(factors PredictionFactors) PredictionConfidence {
    score := 100

    // Reduce confidence if:
    // - Less than 5 recent feeds
    if len(factors.RecentFeedIntervals) < 5 {
        score -= 20
    }

    // - High variance in intervals
    variance := calculateVariance(factors.RecentFeedIntervals)
    if variance > 30*time.Minute {
        score -= 20
    }

    // - Currently sleeping (unpredictable wake time)
    if factors.IsCurrentlySleeping {
        score -= 15
    }

    // - Unusual feed amount
    if factors.LastFeedAmountMl < 40 || factors.LastFeedAmountMl > 120 {
        score -= 10
    }

    if score >= 80 { return HIGH }
    if score >= 60 { return MEDIUM }
    return LOW
}
```

---

## 5. Local Notification System

> **Status: NOT YET IMPLEMENTED.** No notification service or scheduling code exists in the codebase. The design below is planned but not built.

### 5.1 Notification Flow

```
Event Trigger: Activity added OR care session completed OR app opened (poll)
         ↓
    Recalculate prediction
         ↓
    Cancel any existing scheduled notification
         ↓
    Schedule new notification for (predicted_time - 15 minutes)
         ↓
    Store scheduled time in local state
         ↓
    At trigger time: OS delivers notification
         ↓
    User taps notification → Opens app to main screen
```

### 5.2 Notification Content

```typescript
{
  title: "Feed time approaching",
  body: "Emma might be ready to feed around 5:15 PM",
  data: {
    type: "feed_prediction",
    predictedTime: "2024-01-15T17:15:00Z"
  },
  ios: {
    sound: "default",
    badge: 1
  },
  android: {
    channelId: "feed-predictions",
    priority: "high",
    vibrate: true
  }
}
```

### 5.3 Handling Stale Notifications

**Problem:** Device A logs activity at 4pm, Device B hasn't polled yet and still has 5pm notification scheduled.

**Solution:**

- Device B polls periodically
- On poll, if new data found, recalculate and reschedule
- Acceptable staleness for MVP

---

## 6. Backend Architecture

### 6.1 Project Structure

```
backend/
├── server.go                       # Entry point (port 8080)
├── Dockerfile                      # Multi-stage build for Railway
├── .env                            # API keys (never commit)
├── graph/
│   ├── resolver.go                 # DI: Store interface injection
│   ├── schema.resolvers.go         # All resolver implementations
│   ├── helpers.go                  # loadCareSessionWithActivities, summary builder
│   ├── mock_data.go                # Mock prediction data (TODO: replace)
│   └── generated.go                # AUTO-GENERATED by gqlgen — do not edit
└── internal/
    ├── ai/
    │   ├── whisper_client.go       # OpenAI Whisper transcription
    │   ├── claude_client.go        # Claude API for voice text parsing
    │   └── parser.go              # JSON → ParsedActivity/ActivityInput converters
    ├── domain/
    │   └── models.go              # All domain models + enums
    ├── mapper/
    │   └── to_graphql.go          # Domain → GraphQL type converters
    ├── middleware/
    │   └── auth.go                # Header-based auth (X-Family-ID, X-Caregiver-ID, X-Timezone)
    └── store/
        ├── store.go               # Store interface definition
        └── postgres/
            ├── postgres.go        # PostgreSQL implementation
            └── postgres_test.go   # Integration tests
```

**Key architectural note:** There is no separate service layer. All business logic (family auth, session management, activity handling) lives directly in the GraphQL resolvers (`schema.resolvers.go`). The `Store` interface abstracts all database operations and is injected into the resolver via dependency injection.

### 6.2 Resolver Architecture

All business logic is implemented directly in GraphQL resolvers. The resolver receives a `Store` interface at initialization for database operations.

```go
// graph/resolver.go
type Resolver struct {
    Store store.Store
}

func NewResolver(store store.Store) *Resolver {
    return &Resolver{Store: store}
}
```

Key resolver behaviors:

- **CreateFamily:** Validates password (min 6 chars), checks family name uniqueness (case-insensitive), hashes password with bcrypt, creates family + caregiver atomically
- **JoinFamily:** Three-case handling: (1) re-auth same device/family, (2) block different family, (3) create new caregiver
- **AddActivities:** Core workflow resolver with handoff logic — if a different caregiver adds activities, auto-completes the old session + ends active sleeps, creates a new session for the new caregiver
- **CompleteCareSession:** Completes in-progress session, auto-ends all active sleep activities
- **UpdateActivity:** Updates any activity type's details, recalculates duration for feeds/sleeps

### 6.3 Voice Parsing Pipeline

Voice input follows a three-stage pipeline:

1. **Audio Recording** (frontend): Device records audio via microphone
2. **Transcription** (backend → OpenAI Whisper): Raw audio uploaded to backend, sent to OpenAI Whisper v1 API, returns transcribed text. Retries up to 3 times on failure.
3. **Parsing** (backend → Claude API): Transcribed text sent to Claude Sonnet 4.6 with a structured prompt. Uses exponential backoff retry for rate limits (429, 529 status codes). Returns JSON array of parsed activities.

```go
// Simplified flow in parseVoiceInput resolver:
// 1. Receive audio file upload
rawText, err := whisperClient.TranscribeAudio(audioFile)
// 2. Parse text with Claude (timezone-aware)
timezone := middleware.GetTimezone(ctx)
parsedJSON, err := claudeClient.ParseVoiceInput(rawText, time.Now(), timezone)
// 3. Convert to GraphQL types
activities, errors := ai.ConvertToParsedActivities(parsedJSON)
// 4. Return for user confirmation
return ParsedVoiceResult{Success: true, ParsedActivities: activities, RawText: rawText}
```

#### Prompt Template

The Claude prompt is timezone-aware (uses `X-Timezone` header) and defines extraction rules for each activity type:

- **FEED:** Requires start_time, amount_ml, feed_type. Default feed type is "formula" if not specified.
- **SLEEP:** Requires start_time. End time null means ongoing/active sleep.
- **DIAPER:** Requires changed_at, had_poop, had_pee.

Returns a JSON array of activities. If parsing fails, returns `{"error": "reason"}`.

---

## 7. Frontend Architecture

### 7.1 Project Structure

```
frontend/
├── App.tsx                         # Root: Apollo → Auth → Navigation
├── app.json                        # Expo config (runtimeVersion, etc.)
├── eas.json                        # EAS build profiles (dev/preview/production)
├── codegen.ts                      # GraphQL codegen config
├── Dockerfile                      # Expo web export served by `serve`
├── src/
│   ├── components/
│   │   ├── ActivityConfirmationModal.tsx  # Voice parse review & confirm
│   │   ├── ActivityItem.tsx              # Single activity (swipe-to-delete, tap-to-edit)
│   │   ├── CaregiverAvatar.tsx           # Initials badge (hash-colored)
│   │   ├── CurrentSessionCard.tsx        # Dashboard: active session card
│   │   ├── CustomHeader.tsx              # Navigation header with avatar
│   │   ├── EditActivityModal.tsx         # Edit existing activity details
│   │   ├── ManualEntryModal.tsx          # Manual activity entry fallback
│   │   ├── PredictionCard.tsx            # Dashboard: next feed prediction
│   │   ├── RecentSessionCard.tsx         # Dashboard: completed session card
│   │   └── VoiceInputModal.tsx           # Voice recording & processing
│   ├── screens/
│   │   ├── WelcomeScreen.tsx
│   │   ├── CreateFamilyScreen.tsx
│   │   ├── JoinFamilyScreen.tsx
│   │   ├── DashboardScreen.tsx           # Main hub
│   │   ├── CurrentSessionDetailScreen.tsx
│   │   ├── SessionDetailScreen.tsx       # Completed session (read-only)
│   │   ├── PredictionDetailScreen.tsx
│   │   └── SettingsScreen.tsx
│   ├── navigation/
│   │   └── AppNavigator.tsx              # React Navigation v7 stack
│   ├── graphql/
│   │   ├── client.ts                     # Apollo Client v4 + upload support
│   │   ├── queries.ts
│   │   └── mutations.ts
│   ├── contexts/
│   │   └── AuthContext.tsx               # Auth state provider
│   ├── hooks/
│   │   └── useAuth.ts                    # Auth context consumer
│   ├── services/
│   │   ├── authService.ts               # AsyncStorage auth persistence
│   │   └── deviceService.ts             # UUID generation, device name detection
│   ├── config.ts                         # API URL resolution
│   ├── theme/
│   │   ├── colors.ts                     # Color palette + caregiver colors
│   │   └── spacing.ts                    # Responsive spacing + typography scale
│   ├── types/__generated__/              # AUTO-GENERATED by graphql-codegen — do not edit
│   └── utils/
│       └── time.ts                       # formatTime, formatDuration helpers
└── __mocks__/                            # Jest mocks
```

### 7.2 Responsive Design System

```typescript
// theme/spacing.ts
import { Dimensions } from "react-native";

const { width } = Dimensions.get("window");

export const spacing = {
  xs: width * 0.02, // ~8px on 375w
  sm: width * 0.04, // ~16px
  md: width * 0.06, // ~24px
  lg: width * 0.08, // ~32px
  xl: width * 0.12, // ~48px
};

export const layout = {
  cardWidth: "90%",      // 90% of screen width
  maxCardWidth: 450,     // Cap for tablets
  minTouchTarget: 44,    // iOS HIG minimum
  borderRadius: {
    small: 8,
    medium: 12,
    large: 16,
    round: 9999,
  },
};

export const typography = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};
```

### 7.3 Color Palette

```typescript
// theme/colors.ts
export const colors = {
  // Primary (soft blue/teal for calm baby app)
  primary: "#5B9BD5",
  primaryLight: "#A8D5F2",
  primaryDark: "#2E6FA8",

  // Accent (warm peach/coral)
  accent: "#FFB6A3",

  // Functional
  success: "#7BC96F", // Green for confirm
  warning: "#FFD93D", // Yellow for attention
  error: "#FF6B6B", // Red for delete

  // Neutrals
  background: "#F8F9FA",
  surface: "#FFFFFF",
  border: "#E1E8ED",

  // Text
  textPrimary: "#2C3E50",
  textSecondary: "#7F8C9A",
  textLight: "#A8B4C0",

  // Activity colors
  feed: "#5B9BD5",
  diaper: "#FFB6A3",
  sleep: "#B19CD9",
};

// Caregiver colors: 5 fixed badge color pairs, deterministic by caregiver ID hash
export const getCaregiverColor = (caregiverId: string) => { ... };
```

---

## 8. UI Mockups & Components

### 8.1 Welcome Screen (First Launch)

```
┌─────────────────────────────────┐
│                                 │
│         🍼 Baby Baton          │
│                                 │
│   Track baby care together      │
│                                 │
│  ┌─────────────────────────────┐│
│  │   Create New Family         ││
│  └─────────────────────────────┘│
│                                 │
│  ┌─────────────────────────────┐│
│  │   Join Existing Family      ││
│  └─────────────────────────────┘│
│                                 │
└─────────────────────────────────┘
```

### 8.2 Create Family Screen

```
┌─────────────────────────────────┐
│  ← Create Your Family           │
├─────────────────────────────────┤
│                                 │
│  Family Name                    │
│  ┌─────────────────────────────┐│
│  │ Smith Family                ││
│  └─────────────────────────────┘│
│  Choose a unique name           │
│                                 │
│  Baby's Name                    │
│  ┌─────────────────────────────┐│
│  │ Emma                        ││
│  └─────────────────────────────┘│
│                                 │
│  Set Password (min 6 chars)     │
│  ┌─────────────────────────────┐│
│  │ ••••••                      ││
│  └─────────────────────────────┘│
│  Share this with family members │
│                                 │
│  Your Name                      │
│  ┌─────────────────────────────┐│
│  │ Mom                         ││
│  └─────────────────────────────┘│
│  Quick: [Mom] [Dad] [Grandma]   │
│         [Grandpa] [Nanny]       │
│                                 │
│  ┌─────────────────────────────┐│
│  │     Create Family           ││
│  └─────────────────────────────┘│
└─────────────────────────────────┘
```

### 8.3 Join Family Screen

```
┌─────────────────────────────────┐
│  ← Join Family                  │
├─────────────────────────────────┤
│                                 │
│  Family Name                    │
│  ┌─────────────────────────────┐│
│  │ Smith Family                ││
│  └─────────────────────────────┘│
│                                 │
│  Password                       │
│  ┌─────────────────────────────┐│
│  │ ••••••                      ││
│  └─────────────────────────────┘│
│                                 │
│  Your Name                      │
│  ┌─────────────────────────────┐│
│  │ Dad                         ││
│  └─────────────────────────────┘│
│  Quick: [Mom] [Dad] [Grandma]   │
│         [Grandpa] [Nanny]       │
│                                 │
│  ┌─────────────────────────────┐│
│  │      Join Family            ││
│  └─────────────────────────────┘│
│                                 │
│  Ask a family member for the    │
│  family name and password       │
└─────────────────────────────────┘
```

### 8.4 Dashboard Screen

**Header:** `[Baby's Name]'s Baton` with caregiver avatar (tappable → Settings)

```
┌─────────────────────────────────┐
│  Emma's Baton            [Mo] → │
├─────────────────────────────────┤
│                                 │
│  🔮 Next Feed Prediction     >  │
│  ┌─────────────────────────────┐│
│  │  ░░░░░ gradient card ░░░░░  ││
│  │  Upcoming Feed              ││
│  │  5:15 PM                    ││
│  └─────────────────────────────┘│
│                                 │
│  📋 Ongoing Care Session     >  │
│  ┌─────────────────────────────┐│
│  │  Started: 2:00 PM by [Mo]  ││
│  │  Duration: 2h 45m           ││
│  │                              ││
│  │  🍼 Fed 70ml formula         ││
│  │  💩 Changed diaper           ││
│  │  😴 Sleeping (2h 45m)        ││
│  │                              ││
│  │  3 activities total          ││
│  └─────────────────────────────┘│
│                                 │
│  📋 Recent Care Sessions        │
│  ┌─────────────────────────────┐│
│  │  11:30 AM - 1:45 PM [Da] > ││
│  │  2 feeds • 130ml • 1h sleep ││
│  └─────────────────────────────┘│
│                                 │
│  ┌──────────────┐ ┌────────────┐│
│  │  🎤 Voice    │ │ ✏️ Manual  ││
│  └──────────────┘ └────────────┘│
└─────────────────────────────────┘
```

**Bottom Bar:** Two sticky buttons:
- **Voice** (left, blue `#5B9BD5`): Opens VoiceInputModal
- **Manual** (right, darker blue `#2E6FA8`): Opens ManualEntryModal

### 8.5 Settings Screen

```
┌─────────────────────────────────┐
│  ← Family Settings              │
├─────────────────────────────────┤
│                                 │
│  Family Information             │
│  ┌─────────────────────────────┐│
│  │ Family: Smith Family        ││
│  │ Baby: Emma                  ││
│  └─────────────────────────────┘│
│                                 │
│  ─────────────────────────────  │
│                                 │
│  Share Access                   │
│  ┌─────────────────────────────┐│
│  │ To invite family members:   ││
│  │                             ││
│  │ Family Name: Smith Family   ││
│  │ [Copy]                      ││
│  │                             ││
│  │ Password: baby123           ││
│  │ [Copy]                      ││
│  └─────────────────────────────┘│
│                                 │
│  ─────────────────────────────  │
│                                 │
│  Caregivers (3)                 │
│  • Mom (iPhone 12)              │
│  • Dad (Pixel 7)                │
│  • Nana (iPad)                  │
│                                 │
│  ─────────────────────────────  │
│                                 │
│  ┌─────────────────────────────┐│
│  │     Leave Family            ││
│  └─────────────────────────────┘│
└─────────────────────────────────┘
```

**Note:** Baby name is currently display-only. The `updateBabyName` mutation exists in the backend but is not wired up in the UI.

### 8.6 Prediction Detail Screen

```
┌─────────────────────────────────┐
│  ← Next Feed                    │
├─────────────────────────────────┤
│                                 │
│       ┌───────────────┐         │
│       │   5:15 PM     │         │
│       └───────────────┘         │
│                                 │
│       📊 High confidence         │
│       In about 2 hours          │
│                                 │
│  ─────────────────────────────  │
│                                 │
│  Reasoning:                     │
│  Based on 70ml feed at 2:00 PM,│
│  typically goes 3 hours between │
│  feeds, but is currently        │
│  sleeping (2h 15m)              │
│                                 │
│  ─────────────────────────────  │
│                                 │
│  ⚠ Feed approaching!           │
│  (shown if < 30 min away)       │
│                                 │
└─────────────────────────────────┘
```

### 8.7 Current Session Detail Screen

```
┌─────────────────────────────────┐
│  ← Current Care Session         │
├─────────────────────────────────┤
│                                 │
│  [Mo] Mom                       │
│  Started: 2:00 PM               │
│  Duration: 2h 45m               │
│                                 │
│  ─────────────────────────────  │
│                                 │
│  Activities (4):                │
│                                 │
│  ┌─────────────────────────────┐│
│  │ 🍼 Fed 70ml formula    ← ⌫ ││
│  │    2:00 PM - 2:20 PM        ││
│  │    Duration: 20 minutes     ││
│  └─────────────────────────────┘│
│                                 │
│  ┌─────────────────────────────┐│
│  │ 💩 Changed diaper      ← ⌫ ││
│  │    2:25 PM                  ││
│  │    Had poop ✓               ││
│  └─────────────────────────────┘│
│                                 │
│  ┌─────────────────────────────┐│
│  │ 😴 Nap #1              ← ⌫ ││
│  │    10:30 AM - 11:30 AM      ││
│  │    Duration: 1h             ││
│  └─────────────────────────────┘│
│                                 │
│  ┌─────────────────────────────┐│
│  │ 😴 Nap #2 (Active)    LIVE ││
│  │    Started: 2:30 PM         ││
│  │    Duration: 2h 15m         ││
│  │    [Mark as Awake]          ││
│  └─────────────────────────────┘│
│                                 │
│  Session Summary:               │
│  • Total feeds: 1 (70ml)        │
│  • Diaper changes: 1            │
│  • Total sleep: 3h 15m          │
│  • Currently sleeping: Yes      │
│                                 │
│  ┌─────────────────────────────┐ │
│  │  Complete Care Session      │ │
│  └─────────────────────────────┘ │
└─────────────────────────────────┘
```

**Interactions:**
- **Swipe left** on any activity → reveals Delete action
- **Tap** on any activity → opens EditActivityModal
- **Mark as Awake** → calls `endActivity` mutation
- Activities show `← ⌫` to indicate swipe-to-delete

### 8.8 Voice Input Flow

```
Step 1: VoiceInputModal
┌─────────────────────────────────┐
│                                 │
│         ┌───────────┐           │
│         │     🎤    │           │
│         │  (80px)   │           │
│         └───────────┘           │
│    ═══ waveform animation ═══   │
│                                 │
│      Tap to start recording     │
│                                 │
│  Try saying:                    │
│  "Fed 60ml formula at 2pm"     │
│  "Changed diaper, had poop"    │
│  "She's sleeping now"          │
│                                 │
└─────────────────────────────────┘

Step 2: Processing
┌─────────────────────────────────┐
│                                 │
│       ⟳ Processing audio...    │
│                                 │
└─────────────────────────────────┘

Step 3: Error (fallback to manual)
┌─────────────────────────────────┐
│                                 │
│     ⚠ Couldn't process audio   │
│                                 │
│  ┌─────────────────────────────┐│
│  │   Enter Manually Instead    ││
│  └─────────────────────────────┘│
└─────────────────────────────────┘

Step 4: ActivityConfirmationModal
┌─────────────────────────────────┐
│  Confirm Activities             │
├─────────────────────────────────┤
│                                 │
│  You said:                      │
│  "She fed 60ml formula at 2pm, │
│   pooped, and is sleeping now"  │
│                                 │
│  ⚠ Warnings (if any)           │
│                                 │
│  🍼 Feed - 60ml formula         │
│     2:00 PM - 2:45 PM           │
│                                 │
│  💩 Diaper Change - Had poop    │
│     2:25 PM                     │
│                                 │
│  😴 Sleep - Started 2:30 PM     │
│     (ongoing)                   │
│                                 │
│  [↻ Re-record]                  │
│  [✓ Confirm & Save]             │
└─────────────────────────────────┘
```

### 8.9 Manual Entry Flow

```
ManualEntryModal:
┌─────────────────────────────────┐
│  Add Activity                   │
├─────────────────────────────────┤
│                                 │
│  What type?                     │
│  ┌────────┐┌────────┐┌────────┐│
│  │  🍼    ││  💩    ││  😴    ││
│  │ Feed   ││Diaper  ││ Sleep  ││
│  └────────┘└────────┘└────────┘│
│                                 │
│  (Form changes based on type)   │
│                                 │
│  Feed form:                     │
│  ┌─────────────────────────────┐│
│  │ Time: [datetime picker]     ││
│  │ Amount (ml): [___]          ││
│  │ Type: [Formula] [Breast]    ││
│  └─────────────────────────────┘│
│                                 │
│  Diaper form:                   │
│  ┌─────────────────────────────┐│
│  │ Time: [datetime picker]     ││
│  │ Pee: [toggle]               ││
│  │ Poop: [toggle]              ││
│  └─────────────────────────────┘│
│                                 │
│  Sleep form:                    │
│  ┌─────────────────────────────┐│
│  │ Start: [datetime picker]    ││
│  │ Set end time? [toggle]      ││
│  │ End: [datetime picker]      ││
│  └─────────────────────────────┘│
│                                 │
│  ┌─────────────────────────────┐│
│  │       Save Activity         ││
│  └─────────────────────────────┘│
└─────────────────────────────────┘
```

**Platform-specific time pickers:**
- **Web:** `<input type="datetime-local">`
- **iOS:** Native DateTimePicker (always visible)
- **Android:** Button opens DateTimePicker in modal

### 8.10 Edit Activity Flow

The EditActivityModal is similar to ManualEntryModal but pre-populated with existing activity data:
- Available only in CurrentSessionDetailScreen (not for completed sessions)
- Tap an activity → opens EditActivityModal with current values
- Title changes based on type: "Edit Feed", "Edit Diaper Change", "Edit Sleep"
- Save button says "Save Changes"

### 8.11 Navigation Structure

```
App Launch → Check device auth (AsyncStorage)
├─→ No auth → WelcomeScreen
│   ├─→ Create Family → CreateFamilyScreen → DashboardScreen
│   └─→ Join Family → JoinFamilyScreen → DashboardScreen
└─→ Has auth → DashboardScreen
    ├─→ Tap Caregiver Avatar → SettingsScreen
    │   └─→ Leave Family → WelcomeScreen
    ├─→ Tap Prediction Card → PredictionDetailScreen
    ├─→ Tap Current Session → CurrentSessionDetailScreen
    │   ├─→ Tap Activity → EditActivityModal
    │   ├─→ Swipe Activity → Delete
    │   └─→ Complete → DashboardScreen
    ├─→ Tap Recent Session → SessionDetailScreen (read-only)
    ├─→ Tap Voice Button → VoiceInputModal → ActivityConfirmationModal → DashboardScreen
    └─→ Tap Manual Button → ManualEntryModal → DashboardScreen
```

### 8.12 Avatar Design

```typescript
// components/CaregiverAvatar.tsx
// Circular badge with caregiver initials (first 2 letters)
// Color determined by caregiver ID hash (5 fixed color pairs)
// Tappable → navigates to Settings
<TouchableOpacity onPress={() => navigate("Settings")}>
  <View style={[styles.avatar, { backgroundColor: getCaregiverColor(caregiverId) }]}>
    <Text>{name.substring(0, 2)}</Text>
  </View>
</TouchableOpacity>
```

---

## 9. Authentication & Storage

### 9.1 Device Storage (AsyncStorage)

```typescript
// services/authService.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  FAMILY_ID: "@baby_baton:family_id",
  CAREGIVER_ID: "@baby_baton:caregiver_id",
  CAREGIVER_NAME: "@baby_baton:caregiver_name",
  FAMILY_NAME: "@baby_baton:family_name",
  BABY_NAME: "@baby_baton:baby_name",
};

// saveAuth, getAuth, clearAuth, isAuthenticated methods
// Device ID managed separately in deviceService.ts
```

### 9.2 Device Service

```typescript
// services/deviceService.ts
// Generates UUID on first run, persists to AsyncStorage
// Device name detection:
//   - Web: browser detection (Chrome, Safari, Firefox, Edge)
//   - iOS/Android: expo-device (modelName or deviceName)
// Methods: getDeviceId(), getDeviceName(), clearDeviceId()
```

### 9.3 Authentication Flow

```typescript
// contexts/AuthContext.tsx
// Provides: isLoading, isAuthenticated, authData, login(), logout()
// Auth data persisted to AsyncStorage via authService
// Headers injected via Apollo Client link:
//   X-Family-ID, X-Caregiver-ID, X-Timezone
```

---

## 10. Testing Strategy

### 10.1 Voice Parsing Test Cases

```
# Activities with explicit end times
✓ "She fed 60ml formula from 2:30 to 2:50"
✓ "She napped from 10am to 11am, then napped again from 2pm to 3pm"
✓ "Fed 80ml breast milk, pooped, now sleeping"

# Ongoing activities (no end time)
✓ "She's feeding now" (creates feed with end_time=null)
✓ "Started napping at 2pm" (creates sleep with end_time=null)
✓ "She's been sleeping since 3pm" (creates sleep with end_time=null)

# Multiple naps
✓ "She napped 10-11am, fed 60ml at noon, napped again 2-3pm"

# Instant activities
✓ "Changed diaper, had poop"
✓ "Pooped and changed diaper at 10:30"

# Error cases
✗ "She's smiling" (should return error - no trackable activity)
✗ "Give her medicine" (should return error - out of scope)
```

### 10.2 Family Authentication Test Cases

```
# Create family
✓ Create family with unique name
✗ Create family with duplicate name (case-insensitive)
✗ Create family with password < 6 characters

# Join family
✓ Join existing family with correct password
✓ Re-join same family from same device (re-auth)
✗ Join non-existent family
✗ Join with incorrect password
✗ Join different family when device already in a family

# Leave family
✓ Leave family (caregiver + sessions cascade-deleted)
✓ After leaving, device can join another family

# Update baby name
✓ Any caregiver can update baby name (backend only — not yet wired in UI)
```

---

## 11. Performance Requirements

| Metric                  | Target      | Notes                                 |
| ----------------------- | ----------- | ------------------------------------- |
| Voice parse latency     | < 5 seconds | Audio upload + Whisper + Claude + return |
| GraphQL query response  | < 500ms     | Dashboard query with joins            |
| Current session poll    | 10 seconds  | Apollo pollInterval                   |
| Recent sessions poll    | 30 seconds  | Apollo pollInterval                   |
| App cold start          | < 2 seconds | To interactive state                  |
| Memory usage            | < 150MB     | React Native baseline                 |
| Family auth check       | < 100ms     | Cached in AsyncStorage                |

---

## 12. Security Considerations

### 12.1 Authentication (Device-Based)

- Device ID generated as UUID on first launch, stored in AsyncStorage
- Family ID and Caregiver ID sent as HTTP headers on every request
- No JWTs, sessions, or OAuth — this is an MVP tradeoff
- Headers: `X-Family-ID`, `X-Caregiver-ID`, `X-Timezone`

### 12.2 Password Security

- Passwords hashed with bcrypt (default cost)
- Plain text stored in `password` column and displayed in settings for sharing
- Min 6 characters (family-friendly, not high security)
- No password recovery (intentional - ask family member)

### 12.3 Data Isolation

- All queries automatically scoped to family_id
- No cross-family data access possible
- Family deletion cascades to all related data

### 12.4 API Security

- Backend deployed on Railway (public internet, HTTPS)
- CORS configured with allowed origins
- No JWT tokens yet (device-based auth via headers)
- Future: JWT tokens scoping to family

### 12.5 Data Privacy

- Backend data stored in Railway PostgreSQL (production)
- Local PostgreSQL via Docker (development)
- API keys (Claude, OpenAI) stored in backend `.env` — never logged, committed, or exposed

---

## 13. Deployment Configuration

### 13.1 Docker Compose (Local Development — PostgreSQL Only)

```yaml
# docker-compose.yml
version: "3.8"

services:
  postgres:
    image: postgres:15-alpine
    container_name: baby-baton-db
    environment:
      POSTGRES_DB: baby_baton
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

**Note:** Only PostgreSQL runs in Docker. The backend runs locally with `go run server.go` during development. Migrations are applied manually.

### 13.2 Railway Deployment (Production)

- **Backend:** Deployed via `backend/Dockerfile` (multi-stage Go build). Production URL: `babybaton-production.up.railway.app`
- **Frontend (web):** Deployed via `frontend/Dockerfile` (Expo static web export served by `serve`). Production URL: `baby-baton-production.up.railway.app`

### 13.3 EAS (Native Builds)

- **Build profiles** in `eas.json`:
  - `development` — local dev, points to localhost:8080
  - `preview` — internal distribution, points to Railway backend
  - `production` — production distribution, points to Railway backend
- **OTA Updates:** EAS Update for JS bundle updates without rebuilding native app

### 13.4 CI/CD (GitHub Actions)

- **`ci.yml`** — Runs on every push to main and every PR:
  - Frontend: `npm ci` → `typecheck` → `jest --ci` (Node 20)
  - Backend: `go build` → `go test` with real PostgreSQL service container (Go 1.25.3)
- **`deploy-frontend.yml`** — Runs on push to main when frontend/ changes:
  - Publishes EAS Update to `preview` channel for OTA
- **`pr-preview.yml`** — Runs on PRs that touch frontend/:
  - Publishes preview update on per-PR branch, posts QR code comment
- **`eas-build.yml`** — Manual trigger (workflow_dispatch):
  - Builds native iOS/Android apps via EAS Build

### 13.5 Environment Variables

```bash
# Backend .env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/baby_baton?sslmode=disable
PORT=8080
CLAUDE_API_KEY=sk-ant-api03-your-key-here
OPENAI_API_KEY=sk-your-openai-key-here
CORS_ALLOWED_ORIGIN=http://localhost:8081,https://baby-baton-production.up.railway.app

# Frontend (set at EAS build time in eas.json)
EXPO_PUBLIC_API_URL=http://localhost:8080/query  # varies by build profile
```

---

## 14. Getting API Keys

### 14.1 Claude API Key (Voice Parsing)

1. Visit: https://console.anthropic.com
2. Create account / Sign in
3. Navigate to API Keys
4. Click "Create Key" → Name it "Baby Baton App"
5. Copy the key (starts with `sk-ant-api03-...`)
6. Add to `backend/.env`: `CLAUDE_API_KEY=sk-ant-api03-your-actual-key-here`

### 14.2 OpenAI API Key (Whisper Transcription)

1. Visit: https://platform.openai.com
2. Create account / Sign in
3. Navigate to API Keys
4. Click "Create new secret key" → Name it "Baby Baton Whisper"
5. Copy the key (starts with `sk-...`)
6. Add to `backend/.env`: `OPENAI_API_KEY=sk-your-actual-key-here`

### 14.3 Cost Estimate

**Voice parsing usage (per parse = Whisper + Claude):**

- Whisper: ~$0.006/minute of audio (typically < 30 seconds per input)
- Claude Sonnet 4.6: ~200 tokens input, ~500 tokens output ≈ $0.008/parse
- Total per parse: ~$0.01
- 100 parses/month: ~$1.00
- 500 parses/month: ~$5.00

---

## 15. Development Workflow

### Phase 1: Database & Backend Foundation (Week 1-2) ✅

1. Set up Go project structure
2. Implement PostgreSQL schema with family tables
3. Build family authentication (header-based)
4. Create GraphQL resolvers for family operations
5. Test family create/join/leave flows

### Phase 2: Core Backend Features (Week 2-3) ✅

1. Implement care session management
2. Build activity tracking with family scoping
3. Integrate OpenAI Whisper + Claude API for voice parsing
4. Implement activity CRUD (add, update, delete, end)
5. Test with GraphQL playground

### Phase 3: Frontend Foundation (Week 3-4) ✅

1. Set up Expo/React Native project
2. Build welcome, create family, & join family screens
3. Implement device auth with AsyncStorage
4. Build settings screen
5. Test on web, iOS, Android

### Phase 4: Frontend Core Features (Week 4-5) ✅

1. Build dashboard with prediction, current session, recent sessions
2. Implement voice recording + upload
3. Build manual entry modal as fallback
4. Create care session detail screens (current + completed)
5. Add activity editing and swipe-to-delete
6. Connect to real backend API

### Phase 5: Deployment & CI/CD (Week 5-6) ✅

1. Deploy backend to Railway
2. Deploy frontend web to Railway
3. Set up EAS builds for native iOS/Android
4. Configure GitHub Actions CI/CD
5. Set up PR preview with QR codes

### Phase 6: Polish & Ongoing

1. UI/UX refinements
2. Bug fixes
3. Implement feed prediction algorithm (currently mock)
4. Implement local notifications (not yet built)
5. Multi-device testing

---

## 16. Known Limitations & Future Improvements

### MVP Limitations:

- **One baby per family** - No multi-baby support
- **No roles/permissions** - All caregivers are equal admins
- **No QR code joining** - Manual name + password entry
- **Device-based auth** - No proper user accounts (headers only, no JWTs)
- **Mock predictions** - Feed prediction returns hardcoded mock data
- **No notifications** - Local notification system not yet built
- **Baby name not editable in UI** - Backend mutation exists but not wired up in settings

### Post-MVP Improvements:

- Implement real feed prediction algorithm (Section 4)
- Implement local notification system (Section 5)
- Wire up baby name editing in settings UI
- Multi-baby support within a family
- Caregiver roles (admin, viewer, etc.)
- QR code for easy family joining
- Proper user accounts with email
- Cloud backup and cross-device sync
- Analytics and trends dashboard
- Export data (PDF reports)
- Play activity tracking
- Baby milestones and growth tracking
- Multiple language support

---

## 17. Appendix: GraphQL Example Queries

### Create Family

```graphql
mutation CreateFamily {
  createFamily(
    familyName: "Smith Family"
    password: "baby123"
    babyName: "Emma"
    caregiverName: "Mom"
    deviceId: "abc-123-def"
    deviceName: "iPhone 12"
  ) {
    success
    family {
      id
      name
      babyName
    }
    caregiver {
      id
      name
    }
    error
  }
}
```

### Join Family

```graphql
mutation JoinFamily {
  joinFamily(
    familyName: "Smith Family"
    password: "baby123"
    caregiverName: "Dad"
    deviceId: "xyz-789-ghi"
    deviceName: "Pixel 7"
  ) {
    success
    family {
      id
      name
      babyName
    }
    caregiver {
      id
      name
    }
    error
  }
}
```

### Get Dashboard Data

```graphql
query GetDashboard {
  getMyFamily {
    name
    babyName
    caregivers {
      name
      deviceName
    }
  }

  getCurrentSession {
    id
    caregiver {
      name
    }
    startedAt
    activities {
      ... on FeedActivity {
        feedDetails {
          amountMl
          feedType
        }
      }
      ... on SleepActivity {
        sleepDetails {
          isActive
        }
      }
    }
    summary {
      totalFeeds
      totalMl
      currentlyAsleep
    }
  }

  getRecentCareSessions(limit: 3) {
    id
    caregiver {
      name
    }
    startedAt
    completedAt
    summary {
      totalFeeds
      totalMl
      totalSleepMinutes
    }
  }

  predictNextFeed {
    predictedTime
    confidence
    reasoning
  }
}
```

### Parse Voice Input

```graphql
mutation ParseVoice($audioFile: Upload!) {
  parseVoiceInput(audioFile: $audioFile) {
    success
    rawText
    parsedActivities {
      activityType
      feedDetails {
        startTime
        amountMl
        feedType
      }
      diaperDetails {
        changedAt
        hadPoop
        hadPee
      }
      sleepDetails {
        startTime
        endTime
        isActive
      }
    }
    errors
  }
}
```

### Update Activity

```graphql
mutation UpdateActivity($activityId: ID!, $input: ActivityInput!) {
  updateActivity(activityId: $activityId, input: $input) {
    ... on FeedActivity {
      id
      feedDetails {
        startTime
        amountMl
        feedType
      }
    }
  }
}
```

### Leave Family

```graphql
mutation LeaveFamily {
  leaveFamily
}
```
