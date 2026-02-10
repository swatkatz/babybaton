# Frontend Test Creator - Agent Memory

## Project Stack
- Expo SDK 54, React Native 0.81.5, React 19.1.0
- TypeScript, Apollo Client 4 (GraphQL), React Navigation 7
- Audio: expo-audio, expo-speech-recognition
- Icons: lucide-react-native

## Test Infrastructure
- **Framework**: Jest 29.7.0 with `jest-expo` preset
- **Rendering**: @testing-library/react-native v13
- **Config**: `/frontend/jest.config.js`
- **Mock files**: `/frontend/__mocks__/` (fileMock.js, @react-native-async-storage/async-storage.js)
- **Scripts**: `npm test`, `npm run test:watch`, `npm run test:coverage`

## Critical Compatibility Notes
- **MUST use Jest 29.x** (not 30). Jest 30's strict module sandboxing breaks `jest-expo`'s expo/src/winter runtime bootstrap. The error is: "ReferenceError: You are trying to import a file outside of the scope of the test code."
- **react-test-renderer must match React version** (19.1.0). Use `--legacy-peer-deps` when installing.
- The `jest-expo` `setupFilesAfterSetup` key does NOT exist -- it's `setupFilesAfterFramework` (or just omit it).

## Tested Files (10 test suites, 104 tests)
- `src/utils/time.test.ts` - formatTime, formatDuration, formatMinutesToDuration
- `src/services/authService.test.ts` - saveAuth, getAuth (with fallbacks), clearAuth, isAuthenticated
- `src/theme/colors.test.ts` - color constants, getCaregiverColor deterministic hashing
- `src/contexts/AuthContext.test.tsx` - AuthProvider loading/login/logout flow, useAuth outside provider throws
- `src/components/CaregiverAvatar.test.tsx` - Initials extraction, sizing, pressable behavior
- `src/components/ActivityConfirmationModal.test.tsx` - Feed/diaper/sleep card rendering, errors, button interactions
- `src/components/ActivityItem.test.tsx` - Feed/diaper/sleep rendering, LIVE indicator, Mark as Awake, swipe
- `src/components/RecentSessionCard.test.tsx` - Summary display, singular/plural feed text, sleep display
- `src/components/PredictionCard.test.tsx` - Confidence levels, predicted time, press handler
- `src/components/CurrentSessionCard.test.tsx` - Session header, activity count, caregiver name

## Files NOT Yet Tested
- `src/graphql/client.ts` - Apollo client setup (hard to unit test, integration test territory)
- `src/graphql/mutations.ts`, `queries.ts` - GraphQL document definitions (static, low value)
- `src/services/deviceService.ts` - Device ID generation (requires DeviceInfo mock)
- `src/navigation/AppNavigator.tsx` - Navigation config
- All screen files in `src/screens/`
- `src/components/VoiceInputModal.tsx` - Heavy native deps (expo-audio, mutations)
- `src/components/CustomHeader.tsx` - Uses useAuth hook + navigation

## Common Mock Patterns
- lucide-react-native: `jest.mock('lucide-react-native', () => ({ IconName: () => 'IconName' }))`
- expo-linear-gradient: Mock LinearGradient as a View
- react-native-gesture-handler: Mock Swipeable to pass-through children
- date-fns: Mock format() with simple custom formatter
- authService: `jest.mock('../services/authService', () => ({ __esModule: true, default: { getAuth: jest.fn(), ... } }))`
- Time assertions: Avoid hardcoded timezone-specific values; use regex patterns instead

## Architecture Notes
- AuthContext wraps authService (AsyncStorage-backed), provides login/logout/isAuthenticated
- useAuth hook is re-exported from both contexts/ and hooks/ for backward compat
- Generated GraphQL types in `src/types/__generated__/graphql.ts` - union types for Activity
- Activities are discriminated union: FeedActivity | DiaperActivity | SleepActivity (use __typename)
- getCaregiverColor uses hash-based deterministic color assignment from caregiverColors palette
