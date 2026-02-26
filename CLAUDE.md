# BabyBaton

Baby care tracking app for seamless caregiver handoffs. Supports voice input (AI-parsed) and manual entry as a fallback. Multi-family support, smart feed predictions, local notifications.

For full product specs, see `docs/baby_baton_design.md`. **Update that doc after any significant feature or architectural changes.**

## Architecture

Monorepo with three layers:

```
schema.graphql          <- Single source of truth for the API
backend/                <- Go + gqlgen GraphQL server + PostgreSQL
frontend/               <- React Native (Expo) + TypeScript + Apollo Client v4
```

- **Backend:** Go server on port 8080, gqlgen for GraphQL, PostgreSQL 15 via Docker
- **Frontend:** Expo SDK 54, React Native 0.81, Apollo Client v4, React Navigation v7
- **AI:** Voice input recorded on device -> Whisper (OpenAI) for transcription -> Claude API for parsing into structured activities. Manual entry modal as fallback when voice fails.
- **Deployment:** Both backend and frontend deployed on Railway. Frontend also distributed via EAS (Expo Application Services) for native dev/preview/production builds on iOS/Android.

## MVP Design Decisions

These are intentional tradeoffs for MVP speed. Understand them before "fixing" them:

- **Device-based auth, not real auth.** There are no JWTs, sessions, or OAuth. The app sends `X-Family-ID` and `X-Caregiver-ID` headers on every request, stored locally via AsyncStorage. This is not secure — it's an MVP tradeoff.
- **Polling, not subscriptions.** The app polls for data updates rather than using GraphQL subscriptions or WebSockets. This is simpler but means data can be stale.
- **External AI dependency.** Voice parsing depends on Anthropic (Claude) and OpenAI (Whisper) APIs. These can fail due to rate limits, billing issues, or outages. The manual entry modal (`ManualEntryModal.tsx`) exists specifically as a fallback. Always ensure manual entry remains functional as a safety net.
- **One baby per family.** Multi-baby support is explicitly out of scope.
- **All caregivers are equal.** No roles or permissions within a family.
- **Local notifications only.** No cloud push — notifications are device-local.

## Project Structure

```
babybaton/
├── schema.graphql                  # GraphQL schema (START HERE for API changes)
├── docker-compose.yml              # PostgreSQL container
├── migrations/                     # SQL migration files (applied in order)
├── backend/
│   ├── server.go                   # Entry point
│   ├── Dockerfile                  # Multi-stage build for Railway deployment
│   ├── .env                        # API keys — NEVER log, commit, or expose
│   ├── graph/
│   │   ├── resolver.go             # Dependency injection (Store interface)
│   │   ├── schema.resolvers.go     # Resolver implementations
│   │   └── generated.go            # AUTO-GENERATED — do not edit
│   └── internal/
│       ├── ai/                     # Claude/Whisper clients, voice parser
│       ├── domain/                 # Domain models (models.go)
│       ├── mapper/                 # GraphQL <-> domain model mappers
│       ├── middleware/             # Auth middleware (header-based)
│       └── store/                  # Store interface + postgres implementation
│           ├── store.go            # Store interface definition
│           └── postgres/           # PostgreSQL implementation + tests
├── frontend/
│   ├── App.tsx                     # Root: Apollo -> Auth -> Navigation
│   ├── app.json                    # Expo config (runtimeVersion, etc.)
│   ├── eas.json                    # EAS build profiles (dev/preview/production)
│   ├── codegen.ts                  # GraphQL codegen config
│   ├── src/
│   │   ├── components/             # Reusable UI components + colocated tests
│   │   ├── screens/                # Screen components + colocated tests
│   │   ├── navigation/             # AppNavigator with auth-based routing
│   │   ├── graphql/                # Apollo client, queries, mutations
│   │   ├── contexts/               # AuthContext
│   │   ├── hooks/                  # useAuth
│   │   ├── services/               # authService (AsyncStorage)
│   │   ├── theme/                  # colors, styling
│   │   ├── types/__generated__/    # AUTO-GENERATED — do not edit
│   │   └── utils/                  # Helpers (time formatting, etc.)
│   └── __mocks__/                  # Jest mocks
├── scripts/                        # Dev scripts (autodev.sh)
└── .github/workflows/              # CI and deployment (see below)
```

## Dev Environment Setup

### Prerequisites
- Docker (for PostgreSQL)
- Go 1.25+
- Node.js 20+
- Expo CLI (`npx expo`)

### Startup Sequence

1. **Database:** `docker-compose up -d` (PostgreSQL on localhost:5432)
2. **Backend:** `cd backend && go run server.go` (serves on :8080, reads .env)
3. **Frontend:** `cd frontend && npx expo start` (Expo dev server)

### Key Commands

| What | Command | Directory |
|------|---------|-----------|
| Start Postgres | `docker-compose up -d` | root |
| Run backend | `go run server.go` | backend/ |
| Run frontend | `npx expo start` | frontend/ |
| Backend tests | `go test -v -count=1 ./...` | backend/ |
| Frontend tests | `npx jest` | frontend/ |
| Typecheck | `npm run typecheck` | frontend/ |
| GraphQL codegen (frontend) | `npx graphql-codegen --config codegen.ts` | frontend/ |
| GraphQL codegen (backend) | `go run github.com/99designs/gqlgen generate` | backend/ |
| Connect to DB | `docker exec -it baby-baton-db psql -U postgres -d baby_baton` | anywhere |

## Rules

### Test-Driven Development
- **Write tests first.** For new features, write failing tests, then implement until they pass.
- Run backend tests (`go test -v -count=1 ./...` in backend/) for any backend changes.
- Run frontend tests (`npx jest` in frontend/) and typecheck (`npm run typecheck` in frontend/) for any frontend changes.
- Fix **all** TypeScript type errors — never leave type issues unresolved. Never use `any` or `@ts-ignore`.

### Schema Change Workflow
All API changes start in `schema.graphql` — it is the single source of truth.

1. Edit `schema.graphql`
2. Backend: regenerate with `go run github.com/99designs/gqlgen generate` in backend/
3. Backend: implement new resolvers in `graph/schema.resolvers.go`
4. Frontend: regenerate with `npx graphql-codegen --config codegen.ts` in frontend/
5. Frontend: update queries/mutations in `src/graphql/`

### Never Edit Generated Files
- `backend/graph/generated.go` — regenerated by gqlgen
- `frontend/src/types/__generated__/graphql.ts` — regenerated by graphql-codegen

### Design Doc Maintenance
After significant feature or architectural changes, update `docs/baby_baton_design.md` to reflect the current state.

## Common Pitfalls

### Apollo Client v4 Breaking Changes
This project uses **Apollo Client v4** (`@apollo/client ^4.0.9`). Many online solutions and training data target v3 and **will not work**. Always verify against the v4 docs. The codegen setup specifically follows: https://www.apollographql.com/docs/react/development-testing/graphql-codegen

### Cross-Platform Compatibility (Major Pain Point)
React Native libraries must work on **all three platforms: iOS, Android, and Web**. This is one of the biggest sources of bugs:
- Always verify that any new library is compatible with **Expo Go** (no bare native modules)
- Not all APIs behave the same across platforms — test or account for differences
- Use `Platform.OS` checks when platform-specific behavior is needed
- Check library docs for web support — many RN libraries are mobile-only

### Schema-Frontend Mismatches
Custom scalars like `Upload`/`File` don't carry structure through the schema. The React Native file format (`{uri, name, type}`) differs from web `File`/`Blob`. See `frontend/src/graphql/client.ts` for the custom `isExtractableFile` and `formDataAppendFile` handling.

### TypeScript Strictness
`npm run typecheck` can occasionally hang. Always fix all type errors in new code. The codegen config (`codegen.ts`) uses strict settings: `avoidOptionals`, `defaultScalarType: 'unknown'`, `nonOptionalTypename: true`.

### External API Reliability
Voice parsing depends on Anthropic and OpenAI APIs which can fail (rate limits, billing exhaustion, outages). The `ManualEntryModal` exists as a fallback. Never make changes that would break manual entry or make it depend on external APIs.

## CI/CD Pipeline

### GitHub Actions Workflows

**`ci.yml`** — Runs on every push to main and every PR:
- Frontend: `npm ci` -> `typecheck` -> `jest --ci` (Node 20)
- Backend: `go build` -> `go test` with real PostgreSQL service container (Go 1.25.3, runs migrations first)

**`deploy-frontend.yml`** — Runs on push to main when frontend/ changes:
- Publishes an EAS Update to the `preview` channel so dev builds get the latest JS bundle OTA

**`pr-preview.yml`** — Runs on PRs that touch frontend/:
- Publishes a preview update on a per-PR branch (`pr-<number>`)
- Posts a QR code comment on the PR for testing on device
- Warns if native dependencies changed (requires a new EAS build)
- Pins `runtimeVersion` to match the latest preview build to avoid crashes

**`eas-build.yml`** — Manual trigger only (workflow_dispatch):
- Builds native iOS/Android apps via EAS Build
- Supports `preview` and `production` profiles
- Required when native dependencies change (new EAS build needed before OTA updates work)

### Deployment
- **Backend:** Deployed to Railway via `backend/Dockerfile`. Production URL: `babybaton-production.up.railway.app`
- **Frontend (web):** Deployed to Railway via `frontend/Dockerfile` (Expo static web export served by `serve`). Production URL: `baby-baton-production.up.railway.app`
- **Frontend (native):** Distributed via EAS for iOS/Android. Build profiles in `eas.json`:
  - `development` — local dev, points to localhost:8080
  - `preview` — internal distribution, points to Railway backend
  - `production` — production distribution, points to Railway backend

## Environment Variables

Backend `.env` contains API keys — **never log, commit, or expose these values.** Required vars:
- `DATABASE_URL` — PostgreSQL connection string
- `PORT` — server port (default 8080)
- `CLAUDE_API_KEY` — for voice parsing (Anthropic)
- `OPENAI_API_KEY` — for Whisper transcription (OpenAI)

Frontend env vars are set at build time via EAS (`eas.json`):
- `EXPO_PUBLIC_API_URL` — backend URL (varies by build profile)
