# Baby Baton App - Technical Design Document (MVP)

## 1. System Overview

### 1.1 Purpose
A multi-caregiver baby tracking system with voice input for seamless care transitions, smart feed predictions, and local notifications. The app is called "Baby Baton" - representing the passing of care responsibility between caregivers.

### 1.2 MVP Scope
**In Scope:**
- Care session management (start, add activities, complete)
- Voice input with button confirmation
- Track: Feeds, Diaper changes, Sleep
- Display last 3-4 completed care sessions + current in-progress session
- Smart rule-based feed predictions
- Local push notifications (15 min before predicted feed)
- Delete activities
- Responsive UI for all phone sizes

**Out of Scope (Post-MVP):**
- Analytics/trends dashboard
- Play activity tracking (use notes field instead)
- Baby metrics (weight, height, milestones)
- ML-based predictions
- Cloud push notifications
- Multi-baby support

### 1.3 Architecture Diagram
```
┌─────────────────┐         ┌─────────────────┐
│   iOS Device    │         │ Android Device  │
│  (React Native) │         │ (React Native)  │
│                 │         │                 │
│  • Voice Input  │         │  • Voice Input  │
│  • Local Notif  │         │  • Local Notif  │
│  • Predictions  │         │  • Predictions  │
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
- **Containerization:** Docker + Docker Compose
- **Repository:** GitHub (monorepo)

---

## 2. Database Schema

### 2.1 Tables (MVP)

#### `caregivers`
```sql
CREATE TABLE caregivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    device_id VARCHAR(255) UNIQUE NOT NULL,
    device_name VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_caregivers_device_id ON caregivers(device_id);
```

#### `care_sessions`
```sql
CREATE TABLE care_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caregiver_id UUID NOT NULL REFERENCES caregivers(id),
    status VARCHAR(20) NOT NULL CHECK (status IN ('in_progress', 'completed')),
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_care_sessions_status ON care_sessions(status);
CREATE INDEX idx_care_sessions_caregiver ON care_sessions(caregiver_id);
CREATE INDEX idx_care_sessions_started_at ON care_sessions(started_at DESC);
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
- **Play activities:** Not tracked as separate activities; use care_sessions.notes field
- **Cascading deletes:** When care_session is deleted, all activities and their details are removed
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
type Caregiver {
  id: UUID!
  name: String!
  deviceId: String!
  deviceName: String
  createdAt: DateTime!
}

type CareSession {
  id: UUID!
  caregiver: Caregiver!
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

type Activity {
  id: UUID!
  careSessionId: UUID!
  activityType: ActivityType!
  feedDetails: FeedDetails
  diaperDetails: DiaperDetails
  sleepDetails: SleepDetails
  createdAt: DateTime!
}

type FeedDetails {
  id: UUID!
  startTime: DateTime!
  endTime: DateTime
  amountMl: Int
  feedType: FeedType
  durationMinutes: Int
}

type DiaperDetails {
  id: UUID!
  changedAt: DateTime!
  hadPoop: Boolean!
  hadPee: Boolean!
}

type SleepDetails {
  id: UUID!
  startTime: DateTime!
  endTime: DateTime
  durationMinutes: Int
  isActive: Boolean!  # Currently sleeping
}

type NextFeedPrediction {
  predictedTime: DateTime!
  confidence: PredictionConfidence!
  reasoning: String!
  minutesUntilFeed: Int!
}

type ParsedVoiceResult {
  success: Boolean!
  parsedActivities: [ActivityInput!]!
  errors: [String!]
  rawText: String!
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
  # Get or create caregiver by device ID
  getCurrentCaregiver(deviceId: String!, deviceName: String): Caregiver!
  
  # Get recent completed care sessions
  getRecentCareSessions(limit: Int = 4): [CareSession!]!
  
  # Get current in-progress session (if any)
  getCurrentSession: CareSession
  
  # Predict next feed time
  predictNextFeed: NextFeedPrediction!
}

# Mutations
type Mutation {
  # Start a new care session
  startCareSession: CareSession!
  
  # Parse voice and return structured data (for confirmation)
  parseVoiceInput(text: String!): ParsedVoiceResult!
  
  # Add confirmed activities to current session
  addActivities(activities: [ActivityInput!]!): CareSession!
  
  # Combined: parse voice AND add to session (auto-confirm flow)
  addActivitiesFromVoice(text: String!): CareSession!
  
  # Complete current care session
  completeCareSession(notes: String): CareSession!
  
  # Delete an activity
  deleteActivity(activityId: UUID!): Boolean!
}
```

### 3.1 Key Design Decisions

**Single Active Session:**
- Only ONE in-progress session allowed at a time
- Enforced in application logic (not database constraint)
- `startCareSession` checks for existing in-progress sessions

**Voice Input Flow:**
```graphql
# Two-step with confirmation (MVP)
parseVoiceInput(text: "...") → ParsedVoiceResult
addActivities(activities: [...]) → CareSession

# Voice button auto-starts session if none exists
```

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
  body: "Baby might be ready to feed around 5:15 PM",
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
│   │   │   └── 002_indexes.sql
│   │   └── repository.go          # Data access layer
│   ├── domain/
│   │   ├── models.go              # Domain models
│   │   ├── caregiver.go
│   │   ├── care_session.go
│   │   └── activity.go
│   ├── service/
│   │   ├── care_session_service.go # Business logic
│   │   ├── voice_service.go       # Voice parsing with Claude
│   │   └── prediction_service.go  # Feed prediction engine
│   └── ai/
│       └── claude_client.go       # Claude API client
├── pkg/
│   └── utils/
│       ├── time.go                # Time utilities
│       └── errors.go              # Error handling
├── go.mod
├── go.sum
├── .env.example
└── Dockerfile
```

### 6.2 Care Session Service - Single Session Enforcement

```go
// internal/service/care_session_service.go
type CareSessionService struct {
    repo   *db.Repository
    logger *log.Logger
}

func (s *CareSessionService) StartCareSession(
    ctx context.Context,
    caregiverID string,
) (*domain.CareSession, error) {
    // Check if there's already an in-progress session
    existingSession, err := s.repo.GetInProgressSession(ctx)
    if err != nil && err != sql.ErrNoRows {
        return nil, fmt.Errorf("failed to check existing session: %w", err)
    }
    
    if existingSession != nil {
        return nil, errors.New("A care session is already in progress")
    }
    
    // Create new session
    session := &domain.CareSession{
        ID:          uuid.New(),
        CaregiverID: caregiverID,
        Status:      domain.StatusInProgress,
        StartedAt:   time.Now(),
    }
    
    if err := s.repo.CreateCareSession(ctx, session); err != nil {
        return nil, fmt.Errorf("failed to create session: %w", err)
    }
    
    return session, nil
}
```

### 6.3 Voice Parsing with Claude

#### Prompt Template
```go
const voiceParsingPrompt = `You are parsing baby care voice input into structured activities.

Current time: {{.CurrentTime}}
Current timezone: {{.Timezone}}

Voice input: "{{.VoiceText}}"

Rules:
1. "now" or "right now" = current time
2. Relative times like "at 2:30" are absolute within today
3. "for 20 minutes" means duration from start time
4. Default feed type to "formula" if not specified
5. "pooped" means had_poop=true for diaper change
6. If sleep has no end time and text says "sleeping now", it's still active

Extract all activities mentioned. Return JSON array:

[
  {
    "activity_type": "FEED|DIAPER|SLEEP",
    "feed_details": {
      "start_time": "2024-01-15T14:30:00Z",
      "end_time": "2024-01-15T14:50:00Z",
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
│   │   └── PredictionCard.tsx     # Next feed prediction
│   ├── screens/
│   │   ├── HomeScreen.tsx              # Main dashboard (summary cards)
│   │   ├── PredictionDetailScreen.tsx  # Full prediction reasoning
│   │   ├── CurrentSessionDetailScreen.tsx # Current session with delete buttons
│   │   └── SessionDetailScreen.tsx     # Completed session (read-only)
│   ├── graphql/
│   │   ├── queries.ts             # GraphQL queries
│   │   ├── mutations.ts           # GraphQL mutations
│   │   ├── client.ts              # Apollo client setup
│   │   └── mocks.ts               # Mock data for Phase 1
│   ├── services/
│   │   ├── voiceService.ts        # Speech-to-text
│   │   ├── notificationService.ts # Local notifications
│   │   ├── predictionService.ts   # Client-side prediction
│   │   └── deviceService.ts       # Device ID extraction
│   ├── hooks/
│   │   ├── useCareSessions.ts     # Data fetching
│   │   ├── useVoiceInput.ts       # Voice recording
│   │   ├── usePolling.ts          # Polling logic
│   │   └── usePrediction.ts       # Prediction + notification
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
import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const spacing = {
  xs: width * 0.02,   // 8px on 375w
  sm: width * 0.04,   // 16px
  md: width * 0.06,   // 24px
  lg: width * 0.08,   // 32px
  xl: width * 0.12,   // 48px
};

export const button = {
  minHeight: Math.max(60, height * 0.08),  // 8% of screen, min 60px
  fontSize: Math.max(16, width * 0.045),   // Scale with screen
};

export const card = {
  width: width * 0.9,  // 90% of screen width
  maxWidth: 500,       // Cap for tablets
};
```

### 7.3 Color Palette
```typescript
// theme/colors.ts
export const colors = {
  // Primary (soft blue/teal for calm baby app)
  primary: '#5B9BD5',
  primaryLight: '#A8D5F2',
  primaryDark: '#2E6FA8',
  
  // Accent (warm peach/coral)
  accent: '#FFB6A3',
  
  // Functional
  success: '#7BC96F',    // Green for confirm
  warning: '#FFD93D',    // Yellow for attention
  error: '#FF6B6B',      // Red for delete
  
  // Neutrals
  background: '#F8F9FA',
  surface: '#FFFFFF',
  border: '#E1E8ED',
  
  // Text
  textPrimary: '#2C3E50',
  textSecondary: '#7F8C9A',
  textLight: '#A8B4C0',
  
  // Activity colors
  feed: '#5B9BD5',
  diaper: '#FFB6A3',
  sleep: '#B19CD9',
};
```

---

## 8. UI Mockups & Components

### 8.1 Home Screen (Dashboard) - Summary View

**Header:**
- App name: "Baby Baton"
- Profile icon: Shows current caregiver info (name, device name)
- Read-only, consistent color per caregiver (hash of ID)

```
┌─────────────────────────────────┐
│  🍼 Baby Baton      [Profile]   │
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

**Notes:**
- Current Care Session card hidden when no active session
- All cards tappable (chevron indicates navigation)
- Voice button auto-starts session if needed

### 8.2 Prediction Detail Screen

```
┌─────────────────────────────────┐
│  ← Prediction Details           │
├─────────────────────────────────┤
│                                 │
│  🔮 Upcoming Feed               │
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

### 8.3 Current Session Detail Screen

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
│  Activities (3):                │
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
│  │ 😴 Sleeping                 ││
│  │    Started: 2:30 PM         ││
│  │    Duration: 2h 15m (LIVE)  ││
│  │    [Mark as Awake]          ││
│  └─────────────────────────────┘│
│                                 │
│  Session Summary:               │
│  • Total feeds: 1 (70ml)        │
│  • Diaper changes: 1            │
│  • Sleep time: 2h 15m (ongoing) │
│                                 │
│  ┌─────────────────────────────┐ │
│  │  Complete Care Session      │ │
│  └─────────────────────────────┘ │
└─────────────────────────────────┘
```

### 8.4 Recent Session Detail Screen

```
┌─────────────────────────────────┐
│  ← Care Session Details         │
├─────────────────────────────────┤
│                                 │
│  👤 Dad                         │
│  11:30 AM - 1:45 PM             │
│  Duration: 2h 15m               │
│                                 │
│  ─────────────────────────────  │
│                                 │
│  Activities (5):                │
│                                 │
│  ┌─────────────────────────────┐│
│  │ 🍼 Fed 60ml formula         ││
│  │    11:30 AM - 11:50 AM      ││
│  │    Duration: 20 minutes     ││
│  └─────────────────────────────┘│
│                                 │
│  ┌─────────────────────────────┐│
│  │ 💩 Changed diaper           ││
│  │    12:00 PM                 ││
│  │    Had pee ✓                ││
│  └─────────────────────────────┘│
│                                 │
│  ┌─────────────────────────────┐│
│  │ 😴 Napped                   ││
│  │    12:15 PM - 1:15 PM       ││
│  │    Duration: 1h             ││
│  └─────────────────────────────┘│
│                                 │
│  Session Summary:               │
│  • Total feeds: 2 (130ml)       │
│  • Diaper changes: 2            │
│  • Sleep time: 1h               │
│                                 │
│  Notes:                         │
│  She was fussy, might be        │
│  teething. Played for 10 min    │
│                                 │
└─────────────────────────────────┘
```

**Note:** Read-only, no action buttons on activities

### 8.5 Voice Input Flow

**Recording → Parsing → Confirmation Modal**

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
│     2:00 PM - 2:20 PM           │
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

### 8.6 Complete Session Modal

```
┌─────────────────────────────────┐
│  Complete Care Session          │
├─────────────────────────────────┤
│                                 │
│  Add notes (optional):          │
│  ┌─────────────────────────────┐│
│  │ Notes text area...          ││
│  └─────────────────────────────┘│
│                                 │
│  Session Summary:               │
│  • 3 feeds (210ml total)        │
│  • 4 diaper changes             │
│  • 4.5 hours sleep              │
│  • Duration: 6h 30m             │
│                                 │
│  [✓ Complete]                   │
│  [✕ Cancel]                     │
└─────────────────────────────────┘
```

### 8.7 Navigation Structure

```
HomeScreen
├─→ Tap Prediction Card → PredictionDetailScreen
├─→ Tap Current Session → CurrentSessionDetailScreen
│                         └─→ Complete → CompletionModal → HomeScreen
├─→ Tap Recent Session → SessionDetailScreen (read-only)
└─→ Tap Voice Button → VoiceModal → ConfirmationModal → HomeScreen
```

### 8.8 Profile Color Mapping

```typescript
// utils/caregiverColors.ts
const CAREGIVER_COLORS = [
  { bg: '#E8D5F2', text: '#7B2CBF' },  // Purple
  { bg: '#CFE2FF', text: '#0D6EFD' },  // Blue
  { bg: '#FFE5D9', text: '#D85A2B' },  // Orange
  { bg: '#D5F4E6', text: '#2A9D8F' },  // Teal
  { bg: '#FFE0E6', text: '#D84A70' },  // Pink
];

export const getCaregiverColor = (caregiverId: string) => {
  const hash = caregiverId.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  
  const index = Math.abs(hash) % CAREGIVER_COLORS.length;
  return CAREGIVER_COLORS[index];
};
```

### 8.9 Key UI Decisions

**Navigation:** Cards are tappable (chevron indicator), tap navigates to detail screen
**Actions:** Voice button (primary), Complete Session (in detail), Delete Activity (in detail)
**Session State:** Only one active session, voice button auto-starts if needed
**Empty States:** Clear messaging when no data, helpful prompts for next action

---

## 9. Voice Service Implementation

### 9.1 React Native Voice Recording

```typescript
// services/voiceService.ts
import Voice from '@react-native-voice/voice';

class VoiceService {
  private isRecording = false;
  private transcript = '';

  async startRecording(
    onPartialResult: (text: string) => void,
    onFinalResult: (text: string) => void,
    onError: (error: string) => void
  ) {
    try {
      Voice.onSpeechStart = () => {
        this.isRecording = true;
        this.transcript = '';
      };

      Voice.onSpeechPartialResults = (e) => {
        if (e.value && e.value[0]) {
          this.transcript = e.value[0];
          onPartialResult(this.transcript);
        }
      };

      Voice.onSpeechResults = (e) => {
        if (e.value && e.value[0]) {
          this.transcript = e.value[0];
          onFinalResult(this.transcript);
        }
      };

      Voice.onSpeechError = (e) => {
        onError(e.error?.message || 'Speech recognition error');
      };

      await Voice.start('en-US');
    } catch (error) {
      onError(error.message);
    }
  }

  async stopRecording(): Promise<string> {
    try {
      await Voice.stop();
      this.isRecording = false;
      return this.transcript;
    } catch (error) {
      throw new Error('Failed to stop recording');
    }
  }

  async destroy() {
    try {
      await Voice.destroy();
      Voice.removeAllListeners();
    } catch (error) {
      console.error('Failed to destroy voice service', error);
    }
  }
}

export default new VoiceService();
```

### 9.2 Voice Input Hook

```typescript
// hooks/useVoiceInput.ts
import { useState } from 'react';
import { useMutation } from '@apollo/client';
import voiceService from '../services/voiceService';
import { PARSE_VOICE_INPUT, START_CARE_SESSION } from '../graphql/mutations';

export const useVoiceInput = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedResult, setParsedResult] = useState(null);

  const [parseVoice] = useMutation(PARSE_VOICE_INPUT);
  const [startSession] = useMutation(START_CARE_SESSION);

  const startRecording = async (currentSession) => {
    try {
      // Auto-start session if none exists
      if (!currentSession) {
        await startSession();
      }

      setIsRecording(true);
      await voiceService.startRecording(
        (partial) => setTranscript(partial),
        async (final) => {
          setTranscript(final);
          setIsRecording(false);
          await handleParse(final);
        },
        (error) => {
          setIsRecording(false);
          alert(`Voice error: ${error}`);
        }
      );
    } catch (error) {
      setIsRecording(false);
      alert('Failed to start recording');
    }
  };

  const stopRecording = async () => {
    try {
      const final = await voiceService.stopRecording();
      setIsRecording(false);
      await handleParse(final);
    } catch (error) {
      alert('Failed to stop recording');
    }
  };

  const handleParse = async (text: string) => {
    setIsParsing(true);
    try {
      const result = await parseVoice({
        variables: { text }
      });
      setParsedResult(result.data.parseVoiceInput);
    } catch (error) {
      alert('Failed to parse voice input');
    } finally {
      setIsParsing(false);
    }
  };

  const reset = () => {
    setTranscript('');
    setParsedResult(null);
  };

  return {
    isRecording,
    transcript,
    isParsing,
    parsedResult,
    startRecording,
    stopRecording,
    reset
  };
};
```

---

## 10. Notification Service Implementation

### 10.1 Local Notification Manager

```typescript
// services/notificationService.ts
import PushNotification from 'react-native-push-notification';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import { Platform } from 'react-native';

class NotificationService {
  constructor() {
    this.configure();
  }

  configure() {
    PushNotification.configure({
      onNotification: (notification) => {
        if (Platform.OS === 'ios') {
          notification.finish(PushNotificationIOS.FetchResult.NoData);
        }
      },
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },
      popInitialNotification: true,
      requestPermissions: Platform.OS === 'ios',
    });

    if (Platform.OS === 'android') {
      PushNotification.createChannel(
        {
          channelId: 'feed-predictions',
          channelName: 'Feed Predictions',
          channelDescription: 'Notifications for predicted feed times',
          importance: 4,
          vibrate: true,
        },
        (created) => console.log(`Channel created: ${created}`)
      );
    }
  }

  async scheduleNextFeedNotification(
    predictedTime: Date,
    feedDetails: string
  ) {
    await this.cancelFeedNotifications();

    const notificationTime = new Date(predictedTime);
    notificationTime.setMinutes(notificationTime.getMinutes() - 15);

    if (notificationTime <= new Date()) {
      return;
    }

    const formattedTime = predictedTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });

    PushNotification.localNotificationSchedule({
      channelId: 'feed-predictions',
      id: 'next-feed',
      title: 'Feed time approaching',
      message: `Baby might be ready to feed around ${formattedTime}`,
      date: notificationTime,
      allowWhileIdle: true,
      playSound: true,
      soundName: 'default',
      userInfo: {
        type: 'feed_prediction',
        predictedTime: predictedTime.toISOString(),
      },
    });
  }

  async cancelFeedNotifications() {
    PushNotification.cancelLocalNotification('next-feed');
  }

  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'ios') {
      const permissions = await PushNotificationIOS.requestPermissions({
        alert: true,
        badge: true,
        sound: true,
      });
      return permissions.alert === 1;
    }
    return true;
  }
}

export default new NotificationService();
```

---

## 11. Polling Strategy

### 11.1 Polling Hook

```typescript
// hooks/usePolling.ts
import { useEffect, useRef } from 'react';
import { useQuery } from '@apollo/client';
import { AppState } from 'react-native';

export const usePolling = (query, options = {}) => {
  const { pollInterval = 300000, ...restOptions } = options; // 5 min default
  const appState = useRef(AppState.currentState);

  const { data, loading, refetch, startPolling, stopPolling } = useQuery(
    query,
    {
      ...restOptions,
      notifyOnNetworkStatusChange: true,
    }
  );

  useEffect(() => {
    startPolling(pollInterval);

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        refetch();
        startPolling(pollInterval);
      } else if (nextAppState.match(/inactive|background/)) {
        stopPolling();
      }
      appState.current = nextAppState;
    });

    return () => {
      stopPolling();
      subscription.remove();
    };
  }, [pollInterval, startPolling, stopPolling, refetch]);

  return { data, loading, refetch };
};
```

### 11.2 Dashboard Data Hook

```typescript
// hooks/useCareSessions.ts
import { usePolling } from './usePolling';
import { usePrediction } from './usePrediction';
import { GET_DASHBOARD_DATA } from '../graphql/queries';

export const useCareSessions = () => {
  const { data, loading, refetch } = usePolling(GET_DASHBOARD_DATA, {
    pollInterval: 300000,
    fetchPolicy: 'network-only',
  });

  const { prediction, refetch: refetchPrediction } = usePrediction();

  const refresh = async () => {
    await Promise.all([refetch(), refetchPrediction()]);
  };

  return {
    currentSession: data?.getCurrentSession,
    recentCareSessions: data?.getRecentCareSessions || [],
    prediction,
    loading,
    refresh,
  };
};
```

---

## 12. Deployment Configuration

### 12.1 Docker Compose (Local Development)

```yaml
# docker-compose.yml
version: '3.8'

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
      - ./backend/internal/db/migrations:/docker-entrypoint-initdb.d
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

### 12.2 Environment Variables

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

## 13. Getting Claude API Key

### 13.1 Setup Steps

1. Visit: https://console.anthropic.com
2. Create account / Sign in
3. Navigate to API Keys
4. Click "Create Key" → Name it "Baby Baton App"
5. Copy the key (starts with `sk-ant-api03-...`)
6. Add to `backend/.env`: `CLAUDE_API_KEY=sk-ant-api03-your-actual-key-here`

### 13.2 Cost Estimate

**Voice parsing usage:**
- Average parse: ~200 tokens input, ~500 tokens output
- Claude Sonnet 4 pricing: $3/M input tokens, $15/M output tokens
- Cost per parse: ~$0.0081
- 100 parses/month: ~$0.81
- 500 parses/month: ~$4.05

---

## 14. Testing Strategy

### 14.1 Voice Parsing Test Cases

```
✓ "She fed 60ml formula from 2:30 to 2:50"
✓ "Fed 80ml breast milk, pooped, now sleeping"
✓ "Changed diaper, had poop"
✓ "She's been sleeping since 3pm"
✓ "Fed 70ml formula at 2am" (overnight)
✓ "Fed breast milk for 20 minutes"
✓ "Pooped and changed diaper at 10:30"
✓ "Woke up from nap at 4:15"
✗ "She's smiling" (should return error - no trackable activity)
✗ "Give her medicine" (should return error - out of scope)
```

---

## 15. Performance Requirements

| Metric | Target | Notes |
|--------|--------|-------|
| Voice parse latency | < 5 seconds | Speech-to-text + Claude API + DB save |
| GraphQL query response | < 500ms | Dashboard query with joins |
| Poll interval | 5 minutes | Configurable |
| Notification scheduling | < 1 second | Local notification |
| App cold start | < 2 seconds | To interactive state |
| Memory usage | < 150MB | React Native baseline |

---

## 16. Security Considerations

### 16.1 Authentication (Device-Based)
```typescript
import DeviceInfo from 'react-native-device-info';

const getDeviceIdentifier = async () => {
  const uniqueId = await DeviceInfo.getUniqueId();
  const deviceName = await DeviceInfo.getDeviceName();
  
  return {
    deviceId: uniqueId,
    deviceName: deviceName || 'Unknown Device'
  };
};
```

### 16.2 API Security
- Local network only (MVP)
- No authentication required (trusted household network)
- Future: JWT tokens, rate limiting

### 16.3 Data Privacy
- All data on local server (MacBook)
- No cloud sync in MVP
- Optional: encrypted backups to iCloud/Google Drive

---

## 17. Development Workflow

### Phase 1: Mobile with Mocks (Week 1-2)
1. Set up React Native project
2. Build UI components (responsive)
3. Implement voice recording
4. Create mock GraphQL responses
5. Test on real devices

### Phase 2: Backend (Week 3-4)
1. Set up Go project structure
2. Implement PostgreSQL schema
3. Build GraphQL resolvers
4. Integrate Claude API
5. Test prediction algorithm

### Phase 3: Integration (Week 5)
1. Connect mobile to real API
2. End-to-end testing
3. Deploy to local MacBook
4. Test with family members

### Phase 4: Polish (Week 6)
1. Bug fixes
2. UI refinements
3. Documentation
4. Prepare for open source