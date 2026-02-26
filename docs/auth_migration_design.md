# Auth Migration Design Doc: Device-Based to Supabase Auth

## 1. Problem Statement

The current device-based authentication (X-Family-ID / X-Caregiver-ID headers) has fundamental limitations:
- A user on multiple devices (e.g., phone + browser) is treated as different caregivers
- No real session management — headers stored in AsyncStorage/localStorage with no expiry
- No way to sign out and sign back in on a different device
- Identity is tied to a device, not a person

## 2. Goals

- Replace device-based auth with proper user accounts (email+password, Google, Apple sign-in)
- Preserve all existing caregiver data and activity history during migration
- Design for provider swappability — Supabase is the first implementation, but the backend should be provider-agnostic
- Support dual auth (old + new) during the migration window
- Non-breaking rollout — existing clients continue working until migration is complete

## 3. Non-Goals

- Multi-family UI switcher (data model supports it, but no UI for now)
- Email verification enforcement (see Future Work)
- Native app migration (clean install is acceptable)

---

## 4. Architecture Decisions

### 4.1 Auth Provider: Supabase Auth

**Decision:** Use Supabase Auth as a standalone auth service. App data stays on Railway Postgres.

- Supabase manages user accounts, password hashing, OAuth flows (Google/Apple), JWT issuance and refresh
- Our Railway Postgres stores a `supabase_user_id` reference — no auth data lives in our DB
- The Go backend verifies Supabase-issued JWTs via cached JWKS keys (standard JWT verification)
- Frontend uses `@supabase/supabase-js` (works identically on React Native and web)

**Why Supabase:** Free tier (50k MAU), Postgres-native, standard JWTs, solid React Native SDK. Lower stakes decision due to the AuthVerifier abstraction (see 4.2).

### 4.2 Provider-Agnostic Backend: AuthVerifier Interface

**Decision:** The Go backend never knows about Supabase directly. All token verification goes through an interface.

```go
type AuthVerifier interface {
    VerifyToken(ctx context.Context, token string) (userID string, email string, err error)
}
```

- `SupabaseVerifier` is the first (and only) implementation
- Switching providers means: write a new implementation (~50 lines), swap in dependency injection
- Frontend is the harder swap (sign-in SDK/UI), but those screens are isolated

### 4.3 JWKS Caching

**Decision:** The Go backend caches Supabase's JWKS public signing keys and refreshes them periodically (~1 hour).

- Avoids hitting Supabase's JWKS endpoint on every request
- Enables continued JWT verification even if Supabase has a brief outage (already-signed-in users keep working as long as their JWT hasn't expired)
- Standard pattern — use a Go JWKS library with built-in caching (e.g., `lestrrat-go/jwx`)

**Important distinction:** JWKS caching (~1hr refresh) is about caching the _public keys_ used to verify JWTs. This is separate from the JWT token lifetime (also ~1hr by default). The backend never calls Supabase at runtime — it only uses the cached keys to verify the JWT signature and check the `exp` claim.

### 4.4 Token Lifecycle

```
Frontend (supabase-js SDK)                    Backend (Go)
─────────────────────────                     ────────────
Holds: access_token (JWT, ~1hr)
Holds: refresh_token (long-lived)

  ── Request with access_token ──────────────→  Verify JWT signature (cached JWKS)
                                                 Check exp claim
                                                 ✅ Valid → proceed
                                                 ❌ Expired → return 401

  ← 401 ──────────────────────────────────────

SDK sees 401, automatically calls
Supabase API with refresh_token
  ── refresh request ──→ Supabase
  ←── new access_token + new refresh_token ──

  ── Retry with new access_token ────────────→  ✅ Valid → proceed
```

- The backend is stateless — it never calls Supabase
- The frontend SDK handles token refresh automatically
- Refresh tokens support rotation — each use invalidates the old one
- If Supabase is down, refresh fails and user is logged out once current token expires

### 4.5 Data Model: User Owns Caregivers

**Decision:** New `users` table. A user can have one caregiver per family.

```
users (NEW)
├── id                UUID PRIMARY KEY
├── supabase_user_id  TEXT UNIQUE NOT NULL   -- from JWT 'sub' claim
├── email             TEXT NOT NULL
├── created_at        TIMESTAMP
└── updated_at        TIMESTAMP

caregivers (MODIFIED)
├── id                UUID PRIMARY KEY
├── family_id         UUID NOT NULL REFERENCES families(id)
├── user_id           UUID REFERENCES users(id)   -- NEW, nullable during migration
├── name              VARCHAR(100) NOT NULL
├── device_id         VARCHAR(255)                 -- nullable during migration, dropped after
├── device_name       VARCHAR(100)                 -- dropped after migration
├── created_at        TIMESTAMP
└── updated_at        TIMESTAMP
├── UNIQUE(user_id, family_id)                     -- one caregiver per user per family
```

- `user_id` is nullable initially to support existing device-based caregivers during migration
- `device_id` unique constraint is relaxed during migration, then column is dropped after
- `unique(user_id, family_id)` enforced at DB level

### 4.6 Social Login Account Linking

**Decision:** Configure Supabase to auto-link accounts by email.

If a user signs up with email+password and later tries "Sign in with Google" using the same email, Supabase auto-links them to the same account. This prevents duplicate user accounts for the same person.

### 4.7 Email Verification

**Decision:** Disabled for MVP (`MAILER_AUTOCONFIRM = true`). Users get immediate access upon sign-up.

Risk is low: even without email verification, family data is still protected by the family password. Social login users (Google/Apple) are inherently verified by the provider.

**Future:** Enable email verification (`MAILER_AUTOCONFIRM = false`). This requires:
- Supabase sends verification email automatically on sign-up
- Add a "Check your email" screen in the app that waits for confirmation
- Social login users skip this screen (auto-confirmed by provider)
- Supabase handles all token generation/validation for the confirmation link

---

## 5. UX Flow

### 5.1 New User Flow

```
App Launch
  → Sign In / Sign Up screen (Supabase auth)
    → [Sign up with email+password / Google / Apple]
    → No family found for this user
      → Create Family / Join Family screen (same as today, minus device fields)
        → Dashboard
```

### 5.2 Returning User Flow

```
App Launch
  → Valid Supabase session exists (JWT in storage, auto-refreshed)
    → User has a family
      → Dashboard (skip everything)
    → User has no family (e.g., left their family)
      → Create Family / Join Family screen
```

### 5.3 Migration Flow (Existing Browser Users)

```
App Launch (updated app)
  → Old device-based auth found in localStorage (familyId + caregiverId)
  → New auth NOT found (no Supabase session)
    → Migration prompt: "Create an account to keep your data"
      → [Sign up with email+password / Google / Apple]
      → Backend links existing caregiverId to new user_id
      → Old device-based auth cleared from localStorage
      → Dashboard (seamless, all data preserved)
```

### 5.4 Sign Out vs Leave Family

Two distinct actions in Settings:

- **Sign Out**: Log out of Supabase session. Data is preserved. Sign back in on any device and everything is there. Returns to Sign In screen.
- **Leave Family**: Remove yourself from the family. Caregiver record is unlinked/deleted. User account persists. Returns to Create/Join Family screen.

---

## 6. Dual Auth During Migration

**Decision:** The backend supports both auth methods simultaneously during the migration window.

The auth middleware checks in order:
1. `Authorization: Bearer <jwt>` header → new Supabase auth path (verify JWT via AuthVerifier, resolve user → caregiver)
2. `X-Family-ID` + `X-Caregiver-ID` headers → old device-based auth path (existing behavior)
3. Neither → unauthenticated (for createFamily, joinFamily, sign-up mutations)

This allows:
- Updated clients to use Supabase auth immediately
- Old clients (e.g., someone who hasn't refreshed their browser) to keep working temporarily
- A gradual rollout — no big-bang cutover required

**Cleanup:** Once all users have migrated (verified by checking for caregivers with null `user_id`), remove the old device-based auth path (see Part 9).

---

## 7. GraphQL Schema Changes

### Strategy: Additive Only (Non-Breaking)

During the migration window, schema changes are **strictly additive or relaxing**. No fields or params are removed until cleanup (Part 9).

### Modified Mutations (Relax Required Params)

```graphql
# deviceId changed from String! to String (optional)
createFamily(
  familyName: String!
  password: String!
  babyName: String!
  caregiverName: String!
  deviceId: String          # was String!, now optional
  deviceName: String
): AuthResult!

joinFamily(
  familyName: String!
  password: String!
  caregiverName: String!
  deviceId: String          # was String!, now optional
  deviceName: String
): AuthResult!
```

Backend resolver behavior:
- If Bearer token present → use user-based auth, ignore deviceId even if sent
- If no Bearer token but deviceId present → old device-based path (existing behavior)

### New Mutations

```graphql
# Link existing device-based caregiver to a user account (migration)
linkCaregiverToUser(caregiverId: ID!): Caregiver!
```

### New Queries

```graphql
# Get all families the current user belongs to (supports future multi-family)
getMyFamilies: [Family!]!
```

---

## 8. Family Password

**Decision:** Keep as-is. Orthogonal to user auth.

Family password is still required to join a family. It serves a different purpose:
- **User auth** = "who are you?" (identity)
- **Family password** = "are you allowed in this family?" (authorization)

No changes needed to the family password flow.

---

## 9. Implementation Parts

Ordered by dependency — each part builds on the previous ones.

### Part 1: Supabase Project Setup + AuthVerifier Interface (Backend)

Set up the Supabase project (auth only, configure Google/Apple providers, set `MAILER_AUTOCONFIRM = true`, enable auto-linking by email). Implement the `AuthVerifier` interface in Go with a `SupabaseVerifier` that verifies JWTs using cached JWKS keys (e.g., `lestrrat-go/jwx`). Unit tests with mock JWTs. No integration with the rest of the backend yet — just the verification building block.

### Part 2: Database Migration — Users Table + Caregiver Changes

SQL migration to: create `users` table, add nullable `user_id` column to `caregivers`, relax `device_id` unique constraint to allow nulls, add `unique(user_id, family_id)` constraint. Store interface updated with new methods for user CRUD. Tests against real Postgres.

### Part 3: Backend Auth Middleware — Dual Auth Support

Update the auth middleware to support both Bearer token (new) and X-Family-ID/X-Caregiver-ID headers (old). When a Bearer token is present, verify via AuthVerifier, look up or create the user in our DB, resolve to caregiver + family. Fall back to old headers if no Bearer token. Tests for both auth paths.

### Part 4: Backend Resolver Changes

Update `createFamily` and `joinFamily` resolvers: make `deviceId` optional in schema, support user-based auth path (extract user from context, create/link caregiver). Add `linkCaregiverToUser` mutation for migration. Add `getMyFamilies` query. Update `leaveFamily` to preserve user account. Regenerate gqlgen. Tests for all new/modified resolvers.

### Part 5: Frontend — Supabase SDK + Sign In / Sign Up Screens

Integrate `@supabase/supabase-js`. Build Sign In and Sign Up screens with email+password, Google, and Apple options. Wire Supabase session token into Apollo Client's `Authorization: Bearer` header. Regenerate frontend codegen for schema changes. Tests for auth screens.

### Part 6: Frontend — Navigation Refactor + Migration Flow

Update AppNavigator to handle three states: unauthenticated (show sign-in), authenticated-no-family (show create/join), authenticated-with-family (show dashboard). Add migration detection: if old device auth exists in localStorage but no Supabase session, show migration prompt. On successful sign-up, call `linkCaregiverToUser` with the old caregiverId, then clear old auth from storage.

### Part 7: Frontend — Sign Out + Settings Updates

Add Sign Out button in Settings (calls `supabase.auth.signOut()` + clears local state). Keep Leave Family as a separate action. Remove device-related display from Settings. Update CreateFamily/JoinFamily screens to stop sending deviceId when user auth is present.

### Part 8: Verify Migration Complete

Check that all caregivers have a non-null `user_id`. Confirm no clients are using old device-based auth headers. This is a manual verification step before cleanup.

### Part 9: Cleanup — Remove Device-Based Auth (Post-Migration)

After all users have migrated:
- **Database:** Make `user_id` NOT NULL on caregivers. Drop `device_id` and `device_name` columns.
- **Schema:** Remove `deviceId` and `deviceName` params from `createFamily` and `joinFamily` mutations.
- **Backend:** Remove old header-based auth path from middleware. Remove device-based logic from resolvers. Regenerate gqlgen.
- **Frontend:** Remove migration flow, remove device service, remove old auth storage code. Regenerate frontend codegen.

---

## 10. Failure Modes

| Scenario | Impact | Mitigation |
|----------|--------|------------|
| Supabase down — new users | Can't sign up or sign in | No mitigation — same as any auth provider outage. |
| Supabase down — existing users | JWT refresh fails when current token expires (~1hr default) | JWKS caching allows continued verification of non-expired tokens. Consider extending JWT expiry in Supabase dashboard. Show graceful "connection issue" rather than hard logout. |
| Supabase rate limits | Auth endpoints throttled | Free tier is 50k MAU — well beyond current scale. Monitor if growth occurs. |
| Supabase shuts down | Need to switch providers | AuthVerifier interface limits backend changes to ~50 lines. Frontend sign-in screens need rewrite (isolated). Data model is provider-agnostic (only stores external ID). |
| JWT/refresh token stolen from storage | Attacker can impersonate user until tokens are revoked or rotated out | Tokens stored in localStorage (web) / AsyncStorage (native) — not encrypted at rest. Mitigated by: short-lived access tokens (~1hr), refresh token rotation (each use invalidates the old token), ability to revoke sessions from Supabase dashboard, HTTPS-only transport. See Future Work for secure storage improvement. |
| Migration — user doesn't migrate | They keep working on old auth path indefinitely | Dual auth supports this. Can add nudge banners. Eventually force migration and remove old path (Part 9). |

---

## 11. Future Work

Items explicitly deferred from this project:

- **Multi-family UI switcher:** Data model supports multiple families per user (`unique(user_id, family_id)`). Build a family picker in Settings when there is demand.
- **Email verification:** Flip Supabase to `MAILER_AUTOCONFIRM = false`, add "Check your email" screen. Social login users auto-skip.
- **Secure token storage (native):** Use `expo-secure-store` (iOS Keychain / Android Keystore) as a custom storage adapter for `@supabase/supabase-js` on native builds. Encrypts tokens at rest. Web has no equivalent — `localStorage` remains the only option and is the standard approach used by all web apps.
