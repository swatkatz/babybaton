# Baby Handoff App - Technical Design Document (MVP)

## 1. System Overview

### 1.1 Purpose
A multi-caregiver baby tracking system with voice input for seamless care handoffs, smart feed predictions, and local notifications.

### 1.2 MVP Scope
**In Scope:**
- Handoff session management (start, add activities, complete)
- Voice input with button confirmation
- Track: Feeds, Diaper changes, Sleep
- Display last 3-4 completed handoffs + current in-progress session
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

#### `handoff_sessions`
```sql
CREATE TABLE handoff_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caregiver_id UUID NOT NULL REFERENCES caregivers(id),
    status VARCHAR(20) NOT NULL CHECK (status IN ('in_progress', 'completed')),
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_handoff_sessions_status ON handoff_sessions(status);
CREATE INDEX idx_handoff_sessions_caregiver ON handoff_sessions(caregiver_id);
CREATE INDEX idx_handoff_sessions_started_at ON handoff_sessions(started_at DESC);
```

#### `activities`
```sql
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    handoff_session_id UUID NOT NULL REFERENCES handoff_sessions(id) ON DELETE CASCADE,
    activity_type VARCHAR(20) NOT NULL CHECK (activity_type IN ('feed', 'diaper', 'sleep')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activities_session ON activities(handoff_session_id);
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
- **Play activities:** Not tracked as separate activities; use handoff_sessions.notes field
- **Cascading deletes:** When handoff_session is deleted, all activities and their details are removed
- **Timestamps:** All tables have created_at/updated_at for audit trail

---

## 3. GraphQL Schema (MVP)

```graphql
scalar DateTime
scalar UUID

# Enums
enum HandoffStatus {
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

type HandoffSession {
  id: UUID!
  caregiver: Caregiver!
  status: HandoffStatus!
  startedAt: DateTime!
  completedAt: DateTime
  activities: [Activity!]!
  notes: String
  summary: HandoffSummary!
}

type HandoffSummary {
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
  handoffSessionId: UUID!
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
  
  # Get recent completed handoffs
  getRecentHandoffs(limit: Int = 4): [HandoffSession!]!
  
  # Get current in-progress session (if any)
  getCurrentSession: HandoffSession
  
  # Predict next feed time
  predictNextFeed: NextFeedPrediction!
}

# Mutations
type Mutation {
  # Start a new handoff session
  startHandoffSession: HandoffSession!
  
  # Parse voice and return structured data (for confirmation)
  parseVoiceInput(text: String!): ParsedVoiceResult!
  
  # Add confirmed activities to current session
  addActivities(activities: [ActivityInput!]!): HandoffSession!
  
  # Combined: parse voice AND add to session (auto-confirm flow)
  addActivitiesFromVoice(text: String!): HandoffSession!
  
  # Complete current handoff session
  completeHandoffSession(notes: String): HandoffSession!
  
  # Delete an activity
  deleteActivity(activityId: UUID!): Boolean!
}
```

### 3.1 Key Design Decisions

**Two-step voice flow (MVP):**
```graphql
# Step 1: Parse and show to user
parseVoiceInput(text: "She fed 60ml...") 
  → Returns ParsedVoiceResult for UI confirmation

# Step 2: User confirms via button, add to session
addActivities(activities: [...])
  → Stores to database
```

**Alternative single-step (future):**
```graphql
# Auto-confirm flow
addActivitiesFromVoice(text: "She fed 60ml...")
  → Parse + store in one call
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

### 4.4 Reasoning Generation
```go
func generateReasoning(factors PredictionFactors, interval time.Duration) string {
    parts := []string{}
    
    // Base
    parts = append(parts, fmt.Sprintf("Based on %dml feed at %s", 
        factors.LastFeedAmountMl, 
        factors.LastFeedTime.Format("3:04 PM")))
    
    // Pattern
    avgHours := factors.RecentFeedIntervals.Average().Hours()
    parts = append(parts, fmt.Sprintf("typically goes %.1f hours between feeds", avgHours))
    
    // Adjustments
    if factors.IsCurrentlySleeping {
        duration := time.Since(factors.SleepStartTime)
        parts = append(parts, fmt.Sprintf("but is currently sleeping (%d min)", int(duration.Minutes())))
    }
    
    if factors.TimeOfDay >= 22 || factors.TimeOfDay <= 6 {
        parts = append(parts, "night feeds tend to have longer intervals")
    }
    
    return strings.Join(parts, ", ")
}
```

---

## 5. Local Notification System

### 5.1 Notification Flow

```
Event Trigger: Activity added OR handoff completed OR app opened (poll)
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

### 5.3 Notification Permissions

```typescript
// Request permissions on app first launch
async function requestNotificationPermissions() {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    // Show alert explaining why notifications are important
    Alert.alert(
      'Enable Notifications',
      'Get notified 15 minutes before predicted feed times',
      [{ text: 'OK' }]
    );
  }
}
```

### 5.4 Handling Stale Notifications

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
│   │   ├── handoff.go
│   │   └── activity.go
│   ├── service/
│   │   ├── handoff_service.go     # Business logic
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

### 6.2 Voice Parsing with Claude

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

#### Service Implementation
```go
type VoiceService struct {
    claudeClient *ai.ClaudeClient
    logger       *log.Logger
}

func (s *VoiceService) ParseVoiceInput(
    ctx context.Context, 
    text string, 
    currentTime time.Time,
) (*ParsedVoiceResult, error) {
    
    // Build prompt
    prompt := buildPrompt(text, currentTime)
    
    // Call Claude API
    response, err := s.claudeClient.SendMessage(ctx, prompt)
    if err != nil {
        return nil, fmt.Errorf("claude api error: %w", err)
    }
    
    // Parse JSON response
    var activities []ActivityInput
    if err := json.Unmarshal([]byte(response), &activities); err != nil {
        return nil, fmt.Errorf("failed to parse claude response: %w", err)
    }
    
    // Validate activities
    if err := s.validateActivities(activities); err != nil {
        return &ParsedVoiceResult{
            Success: false,
            Errors: []string{err.Error()},
        }, nil
    }
    
    return &ParsedVoiceResult{
        Success: true,
        ParsedActivities: activities,
        RawText: text,
    }, nil
}
```

---

## 7. Mobile App Architecture

### 7.1 Project Structure
```
mobile/
├── src/
│   ├── components/
│   │   ├── HandoffCard.tsx        # Completed handoff display
│   │   ├── ActivityItem.tsx       # Single activity display
│   │   ├── VoiceButton.tsx        # Voice recording UI
│   │   ├── ConfirmationModal.tsx  # Voice parse confirmation
│   │   └── PredictionCard.tsx     # Next feed prediction
│   ├── screens/
│   │   ├── HomeScreen.tsx         # Main dashboard
│   │   └── SessionScreen.tsx      # Current session detail
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
│   │   ├── useHandoffs.ts         # Data fetching
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

### 7.3 Color Palette (Soft, Modern)
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

### 8.1 Home Screen (Dashboard)

```
┌─────────────────────────────────────┐
│  ← Baby Handoff        [Profile]    │  ← SafeArea padding
├─────────────────────────────────────┤
│                                     │
│  🔮 Next Feed Prediction            │
│  ┌───────────────────────────────┐ │
│  │  Around 5:15 PM               │ │
│  │  📊 High confidence            │ │
│  │                                │ │
│  │  Based on 70ml at 2:00 PM,   │ │
│  │  typically 3 hours between    │ │
│  │  feeds                         │ │
│  │                                │ │
│  │  ⏰ Notification in 45 min    │ │
│  └───────────────────────────────┘ │
│                                     │
│  📝 Current Handoff                 │
│  ┌───────────────────────────────┐ │
│  │  Started: 2:00 PM by Mom      │ │
│  │                                │ │
│  │  🍼 Fed 70ml formula           │ │
│  │     2:00 PM - 2:20 PM          │ │
│  │                                │ │
│  │  💩 Changed diaper             │ │
│  │     Had poop  2:25 PM          │ │
│  │                                │ │
│  │  😴 Sleeping since 2:30 PM     │ │
│  │     Duration: 2h 45m           │ │
│  │                                │ │
│  │  [Complete Handoff]            │ │
│  └───────────────────────────────┘ │
│                                     │
│  📋 Recent Handoffs                 │
│  ┌───────────────────────────────┐ │
│  │  11:30 AM - 1:45 PM by Dad    │ │
│  │  2 feeds • 130ml • 1h sleep   │ │
│  └───────────────────────────────┘ │
│  ┌───────────────────────────────┐ │
│  │  8:00 AM - 11:15 AM by Mom    │ │
│  │  2 feeds • 140ml • 2h sleep   │ │
│  └───────────────────────────────┘ │
│                                     │
│         (scrollable)                │
│                                     │
│  ┌─────────────────────────────┐   │
│  │   🎤  Add Activity           │   │  ← Fixed bottom
│  └─────────────────────────────┘   │     60px tall
└─────────────────────────────────────┘
```

**Component breakdown:**
- **PredictionCard**: Shows next feed prediction with confidence and reasoning
- **CurrentSessionCard**: Displays in-progress activities with "Complete" button
- **HandoffCard**: Compact view of completed handoffs
- **VoiceButton**: Large floating button at bottom (thumb zone)

### 8.2 Voice Input Flow

**Step 1: Recording**
```
┌─────────────────────────────────────┐
│                                     │
│         [Wave animation]            │
│                                     │
│      🎤 Listening...                │
│                                     │
│      Tap to stop recording          │
│                                     │
│                                     │
│  ┌─────────────────────────────┐   │
│  │       [Stop] 🔴             │   │
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

**Step 2: Parsing**
```
┌─────────────────────────────────────┐
│                                     │
│      [Spinner animation]            │
│                                     │
│     Parsing your input...           │
│                                     │
└─────────────────────────────────────┘
```

**Step 3: Confirmation Modal**
```
┌─────────────────────────────────────┐
│  Confirm Activities                 │
├─────────────────────────────────────┤
│                                     │
│  You said:                          │
│  "She fed 60ml formula at 2pm,      │
│   pooped, and is sleeping now"      │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  I understood:                      │
│                                     │
│  🍼 Feed                            │
│     60ml formula                    │
│     2:00 PM - 2:20 PM               │
│                                     │
│  💩 Diaper Change                   │
│     Had poop                        │
│     2:25 PM                          │
│                                     │
│  😴 Sleep                           │
│     Started 2:30 PM                 │
│     (ongoing)                       │
│                                     │
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐   │
│  │   ✓ Confirm & Save          │   │  ← 60px, green
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │   ↻ Re-record               │   │  ← 60px, gray
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │   ✕ Cancel                  │   │  ← 50px, light
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

### 8.3 Activity Display Components

**Feed Activity**
```typescript
<View style={styles.activityCard}>
  <View style={styles.activityHeader}>
    <Text style={styles.icon}>🍼</Text>
    <Text style={styles.title}>Fed 70ml formula</Text>
  </View>
  <Text style={styles.timestamp}>2:00 PM - 2:20 PM</Text>
  <Text style={styles.duration}>Duration: 20 minutes</Text>
  <TouchableOpacity style={styles.deleteButton}>
    <Text>🗑️ Delete</Text>
  </TouchableOpacity>
</View>
```

**Diaper Activity**
```typescript
<View style={styles.activityCard}>
  <View style={styles.activityHeader}>
    <Text style={styles.icon}>💩</Text>
    <Text style={styles.title}>Changed diaper</Text>
  </View>
  <Text style={styles.timestamp}>2:25 PM</Text>
  <View style={styles.badges}>
    <Text style={styles.badge}>Poop ✓</Text>
    <Text style={styles.badge}>Pee ✓</Text>
  </View>
</View>
```

**Sleep Activity (Active)**
```typescript
<View style={[styles.activityCard, styles.activeCard]}>
  <View style={styles.activityHeader}>
    <Text style={styles.icon}>😴</Text>
    <Text style={styles.title}>Sleeping</Text>
    <Text style={styles.liveBadge}>LIVE</Text>
  </View>
  <Text style={styles.timestamp}>Started 2:30 PM</Text>
  <Text style={styles.duration}>Duration: 2h 45m</Text>
  <Text style={styles.hint}>Tap to mark as awake</Text>
</View>
```

### 8.4 Complete Handoff Flow

**Complete Handoff Button**
```
┌─────────────────────────────────────┐
│  Current Handoff                    │
│  Started 2:00 PM                    │
│                                     │
│  [Activities listed above]          │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  Complete Handoff           │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

**Notes Input Modal**
```
┌─────────────────────────────────────┐
│  Complete Handoff                   │
├─────────────────────────────────────┤
│                                     │
│  Add notes (optional):              │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ She was fussy, might be     │   │
│  │ teething. Played for 10 min │   │
│  │                             │   │
│  └─────────────────────────────┘   │
│                                     │
│  Summary:                           │
│  • 3 feeds (210ml total)           │
│  • 4 diaper changes                │
│  • 4.5 hours sleep                 │
│                                     │
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐   │
│  │   ✓ Complete                │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │   ✕ Cancel                  │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

### 8.5 Responsive Button Specs

```typescript
// components/Button.tsx
import { StyleSheet, TouchableOpacity, Text, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const Button = ({ type, onPress, children }) => {
  const buttonStyles = {
    confirm: {
      backgroundColor: colors.success,
      minHeight: Math.max(60, height * 0.08),
    },
    rerecord: {
      backgroundColor: colors.textSecondary,
      minHeight: Math.max(60, height * 0.08),
    },
    cancel: {
      backgroundColor: colors.border,
      minHeight: 50,
    },
    voice: {
      backgroundColor: colors.primary,
      minHeight: Math.max(70, height * 0.09),
      borderRadius: 35,
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.button, buttonStyles[type]]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.buttonText}>{children}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: width * 0.9,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    fontSize: Math.max(16, width * 0.045),
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
```

### 8.6 Screen Size Testing Matrix

| Device | Width | Height | Button Height | Font Size |
|--------|-------|--------|---------------|-----------|
| iPhone SE | 375 | 667 | 60px (min) | 16px |
| iPhone 14 | 390 | 844 | 67px | 17px |
| iPhone 14 Pro Max | 430 | 932 | 74px | 19px |
| Galaxy S21 | 360 | 800 | 64px | 16px |
| Pixel 6 | 412 | 915 | 73px | 18px |

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
      // Set up event listeners
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

      // Start recognition
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
import { PARSE_VOICE_INPUT } from '../graphql/mutations';

export const useVoiceInput = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedResult, setParsedResult] = useState(null);

  const [parseVoice] = useMutation(PARSE_VOICE_INPUT);

  const startRecording = async () => {
    try {
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

    // Create Android channel
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
    // Cancel any existing feed notifications
    await this.cancelFeedNotifications();

    // Calculate notification time (15 minutes before)
    const notificationTime = new Date(predictedTime);
    notificationTime.setMinutes(notificationTime.getMinutes() - 15);

    // Don't schedule if in the past
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

    console.log(`Scheduled notification for ${notificationTime.toISOString()}`);
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
    return true; // Android permissions handled in configure
  }
}

export default new NotificationService();
```

### 10.2 Prediction Hook with Notifications

```typescript
// hooks/usePrediction.ts
import { useEffect } from 'react';
import { useQuery } from '@apollo/client';
import notificationService from '../services/notificationService';
import { PREDICT_NEXT_FEED } from '../graphql/queries';

export const usePrediction = () => {
  const { data, loading, refetch } = useQuery(PREDICT_NEXT_FEED, {
    fetchPolicy: 'network-only',
  });

  useEffect(() => {
    if (data?.predictNextFeed) {
      const prediction = data.predictNextFeed;
      const predictedTime = new Date(prediction.predictedTime);

      // Schedule notification
      notificationService.scheduleNextFeedNotification(
        predictedTime,
        prediction.reasoning
      );
    }
  }, [data]);

  return {
    prediction: data?.predictNextFeed,
    loading,
    refetch,
  };
};
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
    // Start polling when component mounts
    startPolling(pollInterval);

    // Handle app state changes
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App came to foreground - refetch immediately
        refetch();
        startPolling(pollInterval);
      } else if (nextAppState.match(/inactive|background/)) {
        // App went to background - stop polling to save battery
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
// hooks/useHandoffs.ts
import { usePolling } from './usePolling';
import { usePrediction } from './usePrediction';
import { GET_DASHBOARD_DATA } from '../graphql/queries';

export const useHandoffs = () => {
  // Poll for handoff data every 5 minutes
  const { data, loading, refetch } = usePolling(GET_DASHBOARD_DATA, {
    pollInterval: 300000,
    fetchPolicy: 'network-only',
  });

  // Get prediction (also polls)
  const { prediction, refetch: refetchPrediction } = usePrediction();

  const refresh = async () => {
    await Promise.all([refetch(), refetchPrediction()]);
  };

  return {
    currentSession: data?.getCurrentSession,
    recentHandoffs: data?.getRecentHandoffs || [],
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
    container_name: baby-handoff-db
    environment:
      POSTGRES_DB: baby_handoff
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
    container_name: baby-handoff-api
    environment:
      DATABASE_URL: postgres://postgres:postgres@postgres:5432/baby_handoff?sslmode=disable
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

### 12.2 Backend Dockerfile

```dockerfile
# backend/Dockerfile
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Install dependencies
RUN apk add --no-cache git

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source
COPY . .

# Build
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o server cmd/server/main.go

# Final stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

COPY --from=builder /app/server .
COPY --from=builder /app/internal/db/migrations ./migrations

EXPOSE 8080

CMD ["./server"]
```

### 12.3 Environment Variables

```bash
# .env.example
# Database
DATABASE_URL=postgres://postgres:postgres@localhost:5432/baby_handoff?sslmode=disable

# Claude API
CLAUDE_API_KEY=sk-ant-api03-your-key-here

# Server
PORT=8080
GIN_MODE=debug

# Mobile App (for development)
API_URL=http://192.168.1.100:8080/graphql
```

### 12.4 Mobile App Configuration

```typescript
// mobile/src/config/index.ts
import { Platform } from 'react-native';

const getApiUrl = () => {
  if (__DEV__) {
    // Development - use your MacBook's local IP
    // Find it with: ipconfig getifaddr en0 (Mac) or ifconfig (Linux)
    return Platform.select({
      ios: 'http://localhost:8080/graphql',
      android: 'http://10.0.2.2:8080/graphql', // Android emulator
      // For real device, use your machine's IP:
      // android: 'http://192.168.1.100:8080/graphql',
    });
  }
  // Production - use your k8s domain
  return 'https://api.babyhandoff.yourdomain.com/graphql';
};

export const config = {
  apiUrl: getApiUrl(),
  pollInterval: 300000, // 5 minutes
  notificationLeadTime: 15, // minutes before feed
};
```

---

## 13. Getting Claude API Key

### 13.1 Step-by-Step Setup

1. **Go to Anthropic Console**
   - Visit: https://console.anthropic.com

2. **Create Account / Sign In**
   - Use email or Google sign-in

3. **Navigate to API Keys**
   - Click on "API Keys" in left sidebar
   - Or go directly to: https://console.anthropic.com/settings/keys

4. **Create New Key**
   - Click "Create Key"
   - Give it a name: "Baby Handoff App"
   - Copy the key (starts with `sk-ant-api03-...`)
   - **Important:** Save it immediately - you can't see it again!

5. **Add to Environment**
   ```bash
   # backend/.env
   CLAUDE_API_KEY=sk-ant-api03-your-actual-key-here
   ```

6. **Billing Setup**
   - Add payment method in console
   - Set spending limits if desired
   - Typical usage for this app: <$5/month

### 13.2 API Cost Estimate

**Voice parsing usage:**
- Average parse: ~200 tokens input, ~500 tokens output
- Claude Sonnet 4 pricing: $3/million input tokens, $15/million output tokens
- Cost per parse: ~$0.0081
- 100 parses/month: ~$0.81
- 500 parses/month: ~$4.05

**Very affordable for household use!**

---

## 14. Testing Strategy

### 14.1 Backend Testing

```go
// internal/service/voice_service_test.go
func TestVoiceParsingBasicFeed(t *testing.T) {
    service := NewVoiceService(mockClaudeClient)
    
    result, err := service.ParseVoiceInput(
        context.Background(),
        "She fed 60ml formula at 2pm",
        time.Date(2024, 1, 15, 14, 30, 0, 0, time.UTC),
    )
    
    assert.NoError(t, err)
    assert.True(t, result.Success)
    assert.Len(t, result.ParsedActivities, 1)
    
    activity := result.ParsedActivities[0]
    assert.Equal(t, "FEED", activity.ActivityType)
    assert.Equal(t, 60, activity.FeedDetails.AmountMl)
}

func TestPredictionSimple(t *testing.T) {
    service := NewPredictionService(mockDB)
    
    // Mock: Last feed was 3 hours ago, 70ml
    prediction, err := service.PredictNextFeed(context.Background())
    
    assert.NoError(t, err)
    assert.NotNil(t, prediction)
    assert.Equal(t, "HIGH", prediction.Confidence)
}
```

### 14.2 Mobile Testing

```typescript
// __tests__/useVoiceInput.test.ts
import { renderHook, act } from '@testing-library/react-hooks';
import { useVoiceInput } from '../hooks/useVoiceInput';

test('voice input flow', async () => {
  const { result } = renderHook(() => useVoiceInput());
  
  // Start recording
  await act(async () => {
    await result.current.startRecording();
  });
  
  expect(result.current.isRecording).toBe(true);
  
  // Stop and parse
  await act(async () => {
    await result.current.stopRecording();
  });
  
  expect(result.current.isParsing).toBe(true);
  // ... assert parsed result
});
```

### 14.3 Voice Parsing Test Cases

```
Test cases to validate:
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
// Device ID generation
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
- Optional: encrypted backups to user's iCloud/Google Drive

---

## 17. Future Enhancements (Post-MVP)

### 17.1 Phase 2 Features
- Analytics dashboard (trends, charts)
- Play activity tracking
- Baby metrics (weight, height, milestones)
- Photo attachments
- Export to CSV/PDF

### 17.2 Phase 3 Features
- ML-based predictions
- Multi-baby support
- Cloud push notifications (Firebase)
- Pediatrician data sharing
- Calendar integration

### 17.3 Phase 4 Features
- Apple Health / Google Fit integration
- Smart watch support
- Alexa/Google Home voice commands
- Web dashboard

---

## 18. Open Source Preparation

### 18.1 Repository Structure
```
baby-handoff/
├── backend/
├── mobile/
├── docs/
│   ├── setup.md
│   ├── api.md
│   └── deployment.md
├── .github/
│   ├── workflows/
│   │   └── ci.yml
│   └── ISSUE_TEMPLATE/
├── LICENSE (MIT)
├── README.md
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
└── docker-compose.yml
```

### 18.2 README Template
```markdown
# Baby Handoff App

Voice-powered baby care tracking for seamless caregiver handoffs.

## Features
- 🎤 Voice input with AI parsing
- 📊 Smart feed predictions
- 🔔 Local notifications
- 👨‍👩‍👧 Multi-caregiver support
- 📱 iOS & Android support

## Quick Start
1. Clone repo
2. Set up Claude API key
3. Run `docker-compose up`
4. Open mobile app

[Detailed setup guide](docs/setup.md)
```

---

## 19. Development Workflow Summary

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

---

## Next Steps

1. **Review this technical design**
2. **Create detailed project plan** (separate document)
3. **Set up development environment**
4. **Begin Phase 1 with Claude Code**

**Ready to proceed with project plan?**