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
- Track: Feeds, Diaper changes, Sleep
- Display last 3-4 completed care sessions + current in-progress session
- Smart rule-based feed predictions
- Local push notifications (15 min before predicted feed)
- Delete activities
- Leave family functionality
- Family settings (view password, caregiver list, edit baby name)
- Responsive UI for all phone sizes

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
┌─────────────────┐         ┌─────────────────┐
│   iOS Device    │         │ Android Device  │
│  (React Native) │         │ (React Native)  │
│                 │         │                 │
│  • Voice Input  │         │  • Voice Input  │
│  • Local Notif  │         │  • Local Notif  │
│  • Predictions  │         │  • Predictions  │
│  • Family Auth  │         │  • Family Auth  │
└────────┬────────┘         └────────┬────────┘
         │                           │
         │    GraphQL over HTTPS     │
         │    Poll every 5 min       │
         └──────────┬────────────────┘
                    │
         ┌──────────▼──────────┐
         │   API Gateway       │
         │   (Go - Port 8080)  │
         └──────────┬──────────┘
                    │
         ┌──────────▼──────────┐
         │   Business Logic    │
         │   - Family Auth     │
         │   - Session Mgmt    │
         │   - Voice Parsing   │
         │   - Predictions     │
         └──────────┬──────────┘
                    │
         ┌──────────▼──────────┐
         │   Claude API        │
         │   (Voice Parsing)   │
         └─────────────────────┘
                    │
         ┌──────────▼──────────┐
         │   PostgreSQL        │
         │   (Docker)          │
         └─────────────────────┘
```

### 1.4 Technology Stack

- **Backend:** Go 1.21+
- **API:** GraphQL (gqlgen)
- **Database:** PostgreSQL 15+
- **Mobile:** React Native + TypeScript
- **GraphQL Client:** Apollo Client
- **Voice:** Device speech-to-text → Claude API for parsing
- **Notifications:** Local notifications (react-native-push-notification)
- **Password Hashing:** bcrypt
- **Containerization:** Docker + Docker Compose
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
    caregiver_id UUID NOT NULL REFERENCES caregivers(id),
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
  - When caregiver leaves (deleted): Their sessions remain but are orphaned (acceptable for MVP)
  - When care_session is deleted: All activities and their details are removed
- **Device Uniqueness:** One device can only be in one family at a time
- **Family Name:** Case-insensitive unique constraint for easy joining
- **Timestamps:** All tables have created_at/updated_at for audit trail

---

## 3. GraphQL Schema (MVP)

```graphql
scalar DateTime
scalar UUID

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
  id: UUID!
  name: String!
  babyName: String!
  caregivers: [Caregiver!]!
  createdAt: DateTime!
}

type Caregiver {
  id: UUID!
  familyId: UUID!
  name: String!
  deviceId: String!
  deviceName: String
  createdAt: DateTime!
}

type CareSession {
  id: UUID!
  caregiver: Caregiver!
  familyId: UUID!
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
  isActive: Boolean!
}

type FeedActivity {
  id: UUID!
  activityType: ActivityType!
  createdAt: DateTime!
  feedDetails: FeedDetails
}

type DiaperActivity {
  id: UUID!
  activityType: ActivityType!
  createdAt: DateTime!
  diaperDetails: DiaperDetails
}

type SleepActivity {
  id: UUID!
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

type ParsedVoiceResult {
  success: Boolean!
  parsedActivities: [ActivityInput!]!
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

  # Care Sessions
  getRecentCareSessions(limit: Int = 4): [CareSession!]!
  getCurrentSession: CareSession
  getCareSession(id: UUID!): CareSession

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

  parseVoiceInput(text: String!): ParsedVoiceResult!

  addActivities(activities: [ActivityInput!]!): CareSession!

  addActivitiesFromVoice(text: String!): CareSession!

  endActivity(activityId: UUID!, endTime: DateTime): Activity!

  completeCareSession(notes: String): CareSession!

  deleteActivity(activityId: UUID!): Boolean!
}
```

### 3.1 Key Design Decisions

**Family Isolation:**

- All queries automatically scope to the caregiver's family
- No cross-family data access possible
- Family membership required for all operations

**Authentication Flow:**

- Device-based authentication (deviceId stored after family join/create)
- Password hashed with bcrypt
- Family name is case-insensitive
- Password shown in plain text in settings (for easy sharing)

**Single Active Session:**

- Only ONE in-progress session allowed per family at a time
- Enforced in application logic
- When new session starts: Auto-completes previous session (if exists) with current timestamp

**Activity Recording Rules:**

- **Feed Activities:**
  - Required: start_time, amount_ml, feed_type
  - End time: User-provided OR auto-calculated as `start_time + 45 minutes`
  - Example: "Fed 60ml at 2pm" → 2:00pm - 2:45pm (default)
  - Example: "Fed 60ml from 2pm to 2:20pm" → 2:00pm - 2:20pm (user-provided)
  - No manual editing after creation
- **Diaper Activities:**
  - Required: timestamp, had_poop, had_pee
  - Instant activity, no duration
- **Sleep Activities:**
  - Required: start_time
  - End time: Optional (null = ongoing/active)
  - Only ONE incomplete sleep allowed per session
  - Can be ended via `endActivity` mutation (Mark as Awake button)
  - Auto-ended when session completes

**Session Completion:**

- Manual: User clicks "Complete Care Session" → Auto-ends any active sleep
- Automatic: New session starts → Previous session auto-completes → Active sleep auto-ended

**Leave Family:**

- Deletes caregiver record
- Device becomes available to join another family
- Sessions created by that caregiver remain (orphaned but visible)

---

## 4. Smart Feed Prediction Algorithm

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

- Device B polls every 5 minutes
- On poll, if new data found, recalculate and reschedule
- Max staleness: 5 minutes (acceptable for MVP)

---

## 6. Backend Architecture

### 6.1 Project Structure

```
backend/
├── cmd/
│   └── server/
│       └── main.go                 # Entry point
├── internal/
│   ├── api/
│   │   ├── resolver.go            # GraphQL root resolver
│   │   ├── schema.resolvers.go    # Generated resolvers
│   │   └── schema.graphql         # GraphQL schema definition
│   ├── db/
│   │   ├── postgres.go            # DB connection & queries
│   │   ├── migrations/            # SQL migration files
│   │   │   ├── 001_init.sql
│   │   │   └── 002_add_families.sql
│   │   └── repository.go          # Data access layer
│   ├── domain/
│   │   ├── models.go              # Domain models
│   │   ├── family.go
│   │   ├── caregiver.go
│   │   ├── care_session.go
│   │   └── activity.go
│   ├── service/
│   │   ├── family_service.go      # Family & auth logic
│   │   ├── care_session_service.go # Business logic
│   │   ├── voice_service.go       # Voice parsing with Claude
│   │   └── prediction_service.go  # Feed prediction engine
│   ├── auth/
│   │   └── device_auth.go         # Device-based authentication
│   └── ai/
│       └── claude_client.go       # Claude API client
├── pkg/
│   └── utils/
│       ├── time.go                # Time utilities
│       ├── errors.go              # Error handling
│       └── password.go            # bcrypt helpers
├── go.mod
├── go.sum
├── .env.example
└── Dockerfile
```

### 6.2 Family Service - Authentication

```go
// internal/service/family_service.go
type FamilyService struct {
    repo   *db.Repository
    logger *log.Logger
}

func (s *FamilyService) CreateFamily(
    ctx context.Context,
    familyName string,
    password string,
    babyName string,
    caregiverName string,
    deviceID string,
    deviceName *string,
) (*domain.Family, *domain.Caregiver, error) {
    // Check family name availability (case-insensitive)
    exists, err := s.repo.FamilyNameExists(ctx, familyName)
    if err != nil {
        return nil, nil, fmt.Errorf("failed to check family name: %w", err)
    }
    if exists {
        return nil, nil, errors.New("Family name already taken")
    }

    // Validate password length
    if len(password) < 6 {
        return nil, nil, errors.New("Password must be at least 6 characters")
    }

    // Hash password
    passwordHash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
    if err != nil {
        return nil, nil, fmt.Errorf("failed to hash password: %w", err)
    }

    // Create family
    family := &domain.Family{
        ID:           uuid.New(),
        Name:         familyName,
        PasswordHash: string(passwordHash),
        BabyName:     babyName,
    }

    if err := s.repo.CreateFamily(ctx, family); err != nil {
        return nil, nil, fmt.Errorf("failed to create family: %w", err)
    }

    // Create caregiver
    caregiver := &domain.Caregiver{
        ID:         uuid.New(),
        FamilyID:   family.ID,
        Name:       caregiverName,
        DeviceID:   deviceID,
        DeviceName: deviceName,
    }

    if err := s.repo.CreateCaregiver(ctx, caregiver); err != nil {
        return nil, nil, fmt.Errorf("failed to create caregiver: %w", err)
    }

    return family, caregiver, nil
}

func (s *FamilyService) JoinFamily(
    ctx context.Context,
    familyName string,
    password string,
    caregiverName string,
    deviceID string,
    deviceName *string,
) (*domain.Family, *domain.Caregiver, error) {
    // Find family (case-insensitive)
    family, err := s.repo.GetFamilyByName(ctx, familyName)
    if err != nil {
        if err == sql.ErrNoRows {
            return nil, nil, errors.New("Family not found")
        }
        return nil, nil, fmt.Errorf("failed to find family: %w", err)
    }

    // Verify password
    if err := bcrypt.CompareHashAndPassword([]byte(family.PasswordHash), []byte(password)); err != nil {
        return nil, nil, errors.New("Incorrect password")
    }

    // Check if device already in a family
    existingCaregiver, err := s.repo.GetCaregiverByDeviceID(ctx, deviceID)
    if err != nil && err != sql.ErrNoRows {
        return nil, nil, fmt.Errorf("failed to check device: %w", err)
    }
    if existingCaregiver != nil {
        return nil, nil, errors.New("Device already belongs to a family. Leave current family first.")
    }

    // Create caregiver
    caregiver := &domain.Caregiver{
        ID:         uuid.New(),
        FamilyID:   family.ID,
        Name:       caregiverName,
        DeviceID:   deviceID,
        DeviceName: deviceName,
    }

    if err := s.repo.CreateCaregiver(ctx, caregiver); err != nil {
        return nil, nil, fmt.Errorf("failed to create caregiver: %w", err)
    }

    return family, caregiver, nil
}

func (s *FamilyService) LeaveFamily(
    ctx context.Context,
    caregiverID string,
) error {
    // Simply delete the caregiver
    // Sessions remain but are orphaned (acceptable for MVP)
    if err := s.repo.DeleteCaregiver(ctx, caregiverID); err != nil {
        return fmt.Errorf("failed to leave family: %w", err)
    }

    return nil
}

func (s *FamilyService) UpdateBabyName(
    ctx context.Context,
    familyID string,
    babyName string,
) (*domain.Family, error) {
    family, err := s.repo.GetFamilyByID(ctx, familyID)
    if err != nil {
        return nil, fmt.Errorf("failed to get family: %w", err)
    }

    family.BabyName = babyName

    if err := s.repo.UpdateFamily(ctx, family); err != nil {
        return nil, fmt.Errorf("failed to update baby name: %w", err)
    }

    return family, nil
}
```

### 6.3 Care Session Service - Family Scoping

```go
// internal/service/care_session_service.go
type CareSessionService struct {
    repo   *db.Repository
    logger *log.Logger
}

func (s *CareSessionService) StartCareSession(
    ctx context.Context,
    caregiverID string,
    familyID string,
) (*domain.CareSession, error) {
    // Check if there's already an in-progress session FOR THIS FAMILY
    existingSession, err := s.repo.GetInProgressSessionForFamily(ctx, familyID)
    if err != nil && err != sql.ErrNoRows {
        return nil, fmt.Errorf("failed to check existing session: %w", err)
    }

    // Auto-complete previous session if exists
    if existingSession != nil {
        now := time.Now()

        // End any active sleep activities
        if err := s.endActiveSleepActivities(ctx, existingSession.ID, now); err != nil {
            return nil, fmt.Errorf("failed to end active sleep: %w", err)
        }

        // Complete the session
        existingSession.Status = domain.StatusCompleted
        existingSession.CompletedAt = now
        if err := s.repo.UpdateCareSession(ctx, existingSession); err != nil {
            return nil, fmt.Errorf("failed to complete existing session: %w", err)
        }

        s.logger.Printf("Auto-completed previous session %s", existingSession.ID)
    }

    // Create new session
    session := &domain.CareSession{
        ID:          uuid.New(),
        CaregiverID: caregiverID,
        FamilyID:    familyID,
        Status:      domain.StatusInProgress,
        StartedAt:   time.Now(),
    }

    if err := s.repo.CreateCareSession(ctx, session); err != nil {
        return nil, fmt.Errorf("failed to create session: %w", err)
    }

    return session, nil
}

// All other methods remain similar but always scope by familyID
func (s *CareSessionService) GetRecentCareSessions(
    ctx context.Context,
    familyID string,
    limit int,
) ([]*domain.CareSession, error) {
    return s.repo.GetRecentCareSessionsForFamily(ctx, familyID, limit)
}

func (s *CareSessionService) GetCurrentSession(
    ctx context.Context,
    familyID string,
) (*domain.CareSession, error) {
    return s.repo.GetInProgressSessionForFamily(ctx, familyID)
}

func (s *CareSessionService) CompleteCareSession(
    ctx context.Context,
    notes string,
) (*domain.CareSession, error) {
    session, err := s.repo.GetInProgressSession(ctx)
    if err != nil {
        if err == sql.ErrNoRows {
            return nil, errors.New("No active care session to complete")
        }
        return nil, fmt.Errorf("failed to get session: %w", err)
    }

    now := time.Now()

    // End any active sleep activities
    if err := s.endActiveSleepActivities(ctx, session.ID, now); err != nil {
        return nil, fmt.Errorf("failed to end active sleep: %w", err)
    }

    // Complete session
    session.Status = domain.StatusCompleted
    session.CompletedAt = now
    session.Notes = notes

    if err := s.repo.UpdateCareSession(ctx, session); err != nil {
        return nil, fmt.Errorf("failed to complete session: %w", err)
    }

    return session, nil
}

func (s *CareSessionService) endActiveSleepActivities(
    ctx context.Context,
    sessionID string,
    endTime time.Time,
) error {
    // Get all sleep activities for session without end_time
    sleepActivities, err := s.repo.GetActiveSleepActivities(ctx, sessionID)
    if err != nil {
        return err
    }

    for _, activity := range sleepActivities {
        activity.SleepDetails.EndTime = endTime
        activity.SleepDetails.DurationMinutes = int(endTime.Sub(activity.SleepDetails.StartTime).Minutes())
        if err := s.repo.UpdateSleepActivity(ctx, activity); err != nil {
            return err
        }
    }

    return nil
}
```

### 6.4 Voice Parsing with Claude

#### Prompt Template

```go
const voiceParsingPrompt = `You are parsing baby care voice input into structured activities.

Current time: {{.CurrentTime}}
Current timezone: {{.Timezone}}

Voice input: "{{.VoiceText}}"

Rules:
1. "now" or "right now" = current time
2. Relative times like "at 2:30" are absolute within today
3. Default feed type to "formula" if not specified
4. "pooped" means had_poop=true for diaper change

FEED ACTIVITIES:
- MUST have: start_time, amount_ml, feed_type
- If end_time provided: use it
- If end_time NOT provided: set to null (will auto-calculate as start_time + 45 minutes)
- Examples:
  * "Fed 60ml at 2pm" → start: 2pm, end: null
  * "Fed 60ml from 2pm to 2:20pm" → start: 2pm, end: 2:20pm

SLEEP ACTIVITIES:
- MUST have: start_time
- If end_time provided: use it (completed nap)
- If end_time NOT provided: set to null (ongoing/active sleep)
- Examples:
  * "Napped from 2pm to 3pm" → start: 2pm, end: 3pm
  * "Started napping at 2pm" → start: 2pm, end: null
  * "She's sleeping now" → start: current_time, end: null

DIAPER ACTIVITIES:
- MUST have: changed_at timestamp
- Extract had_poop and had_pee from context

Extract all activities mentioned. Return JSON array:

[
  {
    "activity_type": "FEED|DIAPER|SLEEP",
    "feed_details": {
      "start_time": "2024-01-15T14:30:00Z",
      "end_time": null,
      "amount_ml": 60,
      "feed_type": "FORMULA"
    },
    "diaper_details": {
      "changed_at": "2024-01-15T14:55:00Z",
      "had_poop": true,
      "had_pee": true
    },
    "sleep_details": {
      "start_time": "2024-01-15T15:00:00Z",
      "end_time": null
    }
  }
]

If you cannot parse the input, return: {"error": "reason"}`
```

---

## 7. Mobile App Architecture

### 7.1 Project Structure

```
mobile/
├── src/
│   ├── components/
│   │   ├── CareSessionCard.tsx    # Completed care session display
│   │   ├── ActivityItem.tsx       # Single activity display
│   │   ├── VoiceButton.tsx        # Voice recording UI
│   │   ├── ConfirmationModal.tsx  # Voice parse confirmation
│   │   ├── PredictionCard.tsx     # Next feed prediction
│   │   └── FamilyAvatar.tsx       # Header avatar with baby name
│   ├── screens/
│   │   ├── WelcomeScreen.tsx           # Family create/join
│   │   ├── HomeScreen.tsx              # Main dashboard
│   │   ├── SettingsScreen.tsx          # Family settings
│   │   ├── PredictionDetailScreen.tsx  # Full prediction reasoning
│   │   ├── CurrentSessionDetailScreen.tsx # Current session with delete
│   │   └── SessionDetailScreen.tsx     # Completed session (read-only)
│   ├── graphql/
│   │   ├── queries.ts             # GraphQL queries
│   │   ├── mutations.ts           # GraphQL mutations
│   │   ├── client.ts              # Apollo client setup
│   │   └── mocks.ts               # Mock data for testing
│   ├── services/
│   │   ├── voiceService.ts        # Speech-to-text
│   │   ├── notificationService.ts # Local notifications
│   │   ├── predictionService.ts   # Client-side prediction
│   │   ├── deviceService.ts       # Device ID extraction
│   │   └── authService.ts         # Family auth & device storage
│   ├── hooks/
│   │   ├── useCareSessions.ts     # Data fetching
│   │   ├── useVoiceInput.ts       # Voice recording
│   │   ├── usePolling.ts          # Polling logic
│   │   ├── usePrediction.ts       # Prediction + notification
│   │   └── useAuth.ts             # Authentication state
│   ├── navigation/
│   │   └── AppNavigator.tsx       # React Navigation
│   ├── theme/
│   │   ├── colors.ts              # Color palette
│   │   ├── typography.ts          # Font styles
│   │   └── spacing.ts             # Responsive spacing
│   └── types/
│       └── graphql.ts             # Generated TS types
├── App.tsx
├── app.json
├── package.json
└── tsconfig.json
```

### 7.2 Responsive Design System

```typescript
// theme/spacing.ts
import { Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

export const spacing = {
  xs: width * 0.02, // 8px on 375w
  sm: width * 0.04, // 16px
  md: width * 0.06, // 24px
  lg: width * 0.08, // 32px
  xl: width * 0.12, // 48px
};

export const button = {
  minHeight: Math.max(60, height * 0.08), // 8% of screen, min 60px
  fontSize: Math.max(16, width * 0.045), // Scale with screen
};

export const card = {
  width: width * 0.9, // 90% of screen width
  maxWidth: 500, // Cap for tablets
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
│                                 │
│  ┌─────────────────────────────┐│
│  │      Join Family            ││
│  └─────────────────────────────┘│
│                                 │
│  Ask a family member for the    │
│  family name and password       │
└─────────────────────────────────┘
```

### 8.4 Home Screen (Dashboard) - Summary View

**Header:**

- Baby name + avatar (tappable → Settings)
- App name: "Baby Baton"

```
┌─────────────────────────────────┐
│  🍼 Baby Baton    [👶 Emma] →   │
├─────────────────────────────────┤
│                                 │
│  🔮 Next Feed Prediction     >  │
│  ┌─────────────────────────────┐│
│  │  Upcoming Feed              ││
│  │  Scheduled for 5:15 PM      ││
│  │  📊 High confidence          ││
│  └─────────────────────────────┘│
│                                 │
│  📋 Current Care Session     >  │
│  ┌─────────────────────────────┐│
│  │  Started: 2:00 PM by Mom    ││
│  │  Duration: 2h 45m            ││
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
│  │  11:30 AM - 1:45 PM by Dad >││
│  │  Duration: 2h 15m            ││
│  │  2 feeds • 130ml • 1h sleep ││
│  └─────────────────────────────┘│
│                                 │
│  ┌─────────────────────────────┐ │
│  │   🎤  Add Activity          │ │
│  └─────────────────────────────┘ │
└─────────────────────────────────┘
```

### 8.5 Settings Screen

```
┌─────────────────────────────────┐
│  ← Family Settings              │
├─────────────────────────────────┤
│                                 │
│  Family Information             │
│  ┌─────────────────────────────┐│
│  │ Family: Smith Family        ││
│  │                             ││
│  │ Baby Name                   ││
│  │ ┌───────────────────────┐   ││
│  │ │ Emma                  │   ││
│  │ └───────────────────────┘   ││
│  │ [Update Baby Name]          ││
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

### 8.6 Prediction Detail Screen

```
┌─────────────────────────────────┐
│  ← Prediction Details           │
├─────────────────────────────────┤
│                                 │
│  🔮 Upcoming Feed for Emma      │
│  Scheduled for 5:15 PM          │
│  📊 High confidence              │
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
│  Prediction Factors:            │
│  • Avg interval: 3.2 hours      │
│  • Last amount: Above average   │
│  • Currently sleeping: Yes      │
│  • Time of day: Afternoon       │
│  • Confidence: High             │
│                                 │
└─────────────────────────────────┘
```

### 8.7 Current Session Detail Screen

```
┌─────────────────────────────────┐
│  ← Current Care Session         │
├─────────────────────────────────┤
│                                 │
│  👤 Mom                         │
│  Started: 2:00 PM               │
│  Duration: 2h 45m               │
│                                 │
│  ─────────────────────────────  │
│                                 │
│  Activities (4):                │
│                                 │
│  ┌─────────────────────────────┐│
│  │ 🍼 Fed 70ml formula         ││
│  │    2:00 PM - 2:20 PM        ││
│  │    Duration: 20 minutes     ││
│  │    [Delete Activity]         ││
│  └─────────────────────────────┘│
│                                 │
│  ┌─────────────────────────────┐│
│  │ 💩 Changed diaper           ││
│  │    2:25 PM                  ││
│  │    Had poop ✓               ││
│  │    [Delete Activity]         ││
│  └─────────────────────────────┘│
│                                 │
│  ┌─────────────────────────────┐│
│  │ 😴 Nap #1                   ││
│  │    10:30 AM - 11:30 AM      ││
│  │    Duration: 1h             ││
│  │    [Delete Activity]         ││
│  └─────────────────────────────┘│
│                                 │
│  ┌─────────────────────────────┐│
│  │ 😴 Nap #2 (Active)          ││
│  │    Started: 2:30 PM         ││
│  │    Duration: 2h 15m (LIVE)  ││
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

### 8.8 Voice Input Flow

```
Confirmation Modal:
┌─────────────────────────────────┐
│  Confirm Activities             │
├─────────────────────────────────┤
│                                 │
│  You said:                      │
│  "She fed 60ml formula at 2pm,  │
│   pooped, and is sleeping now"  │
│                                 │
│  I understood:                  │
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
│  [✓ Confirm & Save]             │
│  [↻ Re-record]                  │
│  [✕ Cancel]                     │
└─────────────────────────────────┘
```

### 8.9 Navigation Structure

```
App Launch → Check device auth
├─→ No auth → WelcomeScreen
│   ├─→ Create Family → HomeScreen
│   └─→ Join Family → HomeScreen
└─→ Has auth → HomeScreen
    ├─→ Tap Baby Avatar → SettingsScreen
    │   ├─→ Leave Family → WelcomeScreen
    │   └─→ Update Baby Name → HomeScreen
    ├─→ Tap Prediction Card → PredictionDetailScreen
    ├─→ Tap Current Session → CurrentSessionDetailScreen
    │   └─→ Complete → CompletionModal → HomeScreen
    ├─→ Tap Recent Session → SessionDetailScreen (read-only)
    └─→ Tap Voice Button → VoiceModal → ConfirmationModal → HomeScreen
```

### 8.10 Avatar Design

```typescript
// components/FamilyAvatar.tsx
// Displays baby name with icon, taps to settings
<TouchableOpacity onPress={() => navigate("Settings")}>
  <View style={styles.avatar}>
    <Baby size={20} />
    <Text>{babyName}</Text>
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
  DEVICE_ID: "@baby_baton:device_id",
  FAMILY_ID: "@baby_baton:family_id",
  CAREGIVER_ID: "@baby_baton:caregiver_id",
  FAMILY_NAME: "@baby_baton:family_name",
  BABY_NAME: "@baby_baton:baby_name",
};

class AuthService {
  async saveAuth(data: {
    familyId: string;
    caregiverId: string;
    familyName: string;
    babyName: string;
  }) {
    await AsyncStorage.multiSet([
      [KEYS.FAMILY_ID, data.familyId],
      [KEYS.CAREGIVER_ID, data.caregiverId],
      [KEYS.FAMILY_NAME, data.familyName],
      [KEYS.BABY_NAME, data.babyName],
    ]);
  }

  async getAuth() {
    const keys = await AsyncStorage.multiGet([
      KEYS.FAMILY_ID,
      KEYS.CAREGIVER_ID,
      KEYS.FAMILY_NAME,
      KEYS.BABY_NAME,
    ]);

    const [familyId, caregiverId, familyName, babyName] = keys.map((k) => k[1]);

    if (!familyId || !caregiverId) return null;

    return { familyId, caregiverId, familyName, babyName };
  }

  async clearAuth() {
    await AsyncStorage.multiRemove([
      KEYS.FAMILY_ID,
      KEYS.CAREGIVER_ID,
      KEYS.FAMILY_NAME,
      KEYS.BABY_NAME,
    ]);
  }

  async getDeviceId(): Promise<string> {
    let deviceId = await AsyncStorage.getItem(KEYS.DEVICE_ID);
    if (!deviceId) {
      deviceId = await DeviceInfo.getUniqueId();
      await AsyncStorage.setItem(KEYS.DEVICE_ID, deviceId);
    }
    return deviceId;
  }
}

export default new AuthService();
```

### 9.2 Authentication Flow

```typescript
// hooks/useAuth.ts
import { useState, useEffect } from "react";
import authService from "../services/authService";

export const useAuth = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [auth, setAuth] = useState(null);

  useEffect(() => {
    loadAuth();
  }, []);

  const loadAuth = async () => {
    const savedAuth = await authService.getAuth();
    setAuth(savedAuth);
    setIsLoading(false);
  };

  const login = async (familyId, caregiverId, familyName, babyName) => {
    await authService.saveAuth({ familyId, caregiverId, familyName, babyName });
    setAuth({ familyId, caregiverId, familyName, babyName });
  };

  const logout = async () => {
    await authService.clearAuth();
    setAuth(null);
  };

  return {
    isLoading,
    isAuthenticated: !!auth,
    familyId: auth?.familyId,
    caregiverId: auth?.caregiverId,
    familyName: auth?.familyName,
    babyName: auth?.babyName,
    login,
    logout,
  };
};
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
✗ Join non-existent family
✗ Join with incorrect password
✗ Join when device already in a family

# Leave family
✓ Leave family (caregiver deleted, sessions remain)
✓ After leaving, device can join another family

# Update baby name
✓ Any caregiver can update baby name
✓ Baby name updated shows immediately for all devices
```

---

## 11. Performance Requirements

| Metric                  | Target      | Notes                                 |
| ----------------------- | ----------- | ------------------------------------- |
| Voice parse latency     | < 5 seconds | Speech-to-text + Claude API + DB save |
| GraphQL query response  | < 500ms     | Dashboard query with joins            |
| Poll interval           | 5 minutes   | Configurable                          |
| Notification scheduling | < 1 second  | Local notification                    |
| App cold start          | < 2 seconds | To interactive state                  |
| Memory usage            | < 150MB     | React Native baseline                 |
| Family auth check       | < 100ms     | Cached in AsyncStorage                |

---

## 12. Security Considerations

### 12.1 Authentication (Family-Based)

```typescript
import DeviceInfo from "react-native-device-info";
import AsyncStorage from "@react-native-async-storage/async-storage";

const getDeviceAuth = async () => {
  const deviceId = await DeviceInfo.getUniqueId();
  const auth = await AsyncStorage.getItem("@baby_baton:auth");

  return {
    deviceId,
    familyId: auth?.familyId,
    caregiverId: auth?.caregiverId,
  };
};
```

### 12.2 Password Security

- Passwords hashed with bcrypt (cost 10)
- Plain text displayed in settings for sharing
- Min 6 characters (family-friendly, not high security)
- No password recovery (intentional - ask family member)

### 12.3 Data Isolation

- All queries automatically scoped to family_id
- No cross-family data access possible
- Family deletion cascades to all related data

### 12.4 API Security

- Local network only (MVP)
- No JWT tokens yet (device-based auth via deviceId)
- Future: JWT tokens scoping to family

### 12.5 Data Privacy

- All data on local server (MacBook)
- No cloud sync in MVP
- Optional: encrypted backups to iCloud/Google Drive

---

## 13. Deployment Configuration

### 13.1 Docker Compose (Local Development)

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
      - ./migrations:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: baby-baton-api
    environment:
      DATABASE_URL: postgres://postgres:postgres@postgres:5432/baby_baton?sslmode=disable
      CLAUDE_API_KEY: ${CLAUDE_API_KEY}
      PORT: 8080
      GIN_MODE: debug
    ports:
      - "8080:8080"
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./backend:/app
    command: ["go", "run", "cmd/server/main.go"]

volumes:
  postgres_data:
```

### 13.2 Environment Variables

```bash
# .env.example
# Database
DATABASE_URL=postgres://postgres:postgres@localhost:5432/baby_baton?sslmode=disable

# Claude API
CLAUDE_API_KEY=sk-ant-api03-your-key-here

# Server
PORT=8080
GIN_MODE=debug

# Mobile App (for development)
API_URL=http://192.168.1.100:8080/graphql
```

---

## 14. Getting Claude API Key

### 14.1 Setup Steps

1. Visit: https://console.anthropic.com
2. Create account / Sign in
3. Navigate to API Keys
4. Click "Create Key" → Name it "Baby Baton App"
5. Copy the key (starts with `sk-ant-api03-...`)
6. Add to `backend/.env`: `CLAUDE_API_KEY=sk-ant-api03-your-actual-key-here`

### 14.2 Cost Estimate

**Voice parsing usage:**

- Average parse: ~200 tokens input, ~500 tokens output
- Claude Sonnet 4 pricing: $3/M input tokens, $15/M output tokens
- Cost per parse: ~$0.0081
- 100 parses/month: ~$0.81
- 500 parses/month: ~$4.05

---

## 15. Development Workflow

### Phase 1: Database & Backend Foundation (Week 1-2)

1. Set up Go project structure
2. Implement PostgreSQL schema with family tables
3. Build family authentication service
4. Create GraphQL resolvers for family operations
5. Test family create/join/leave flows

### Phase 2: Core Backend Features (Week 2-3)

1. Implement care session management
2. Build activity tracking with family scoping
3. Integrate Claude API for voice parsing
4. Implement prediction algorithm
5. Test with curl/Postman

### Phase 3: Mobile Foundation (Week 3-4)

1. Set up React Native project
2. Build welcome & authentication screens
3. Implement device auth with AsyncStorage
4. Create family create/join flows
5. Build settings screen
6. Test on real devices

### Phase 4: Mobile Core Features (Week 4-5)

1. Build home dashboard
2. Implement voice recording
3. Create care session screens
4. Add activity management
5. Connect to real backend API
6. Implement local notifications

### Phase 5: Integration & Testing (Week 5-6)

1. End-to-end testing
2. Multi-device testing
3. Family switching scenarios
4. Voice parsing accuracy
5. Notification reliability

### Phase 6: Polish & Launch (Week 6)

1. UI/UX refinements
2. Bug fixes
3. Documentation
4. Deploy to local MacBook
5. Test with real family members
6. Prepare for open source

---

## 16. Known Limitations & Future Improvements

### MVP Limitations:

- **One baby per family** - No multi-baby support
- **No roles/permissions** - All caregivers are equal admins
- **No QR code joining** - Manual name + password entry
- **Orphaned sessions** - When caregiver leaves, their sessions remain
- **Device-based auth** - No proper user accounts
- **Local only** - No cloud backup or sync

### Post-MVP Improvements:

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

### Leave Family

```graphql
mutation LeaveFamily {
  leaveFamily
}
```
