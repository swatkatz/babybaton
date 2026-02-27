# BabyBaton

Voice-powered baby care tracking for seamless caregiver handoffs.

BabyBaton helps parents and caregivers coordinate baby care with minimal friction. Record activities by voice — the app transcribes with Whisper and parses with Claude into structured entries — or use manual entry as a fallback. Track feeds, diapers, and sleep across multiple caregivers with smart feed predictions and local notifications.

## Demo

<p align="center">
  <img src="docs/assets/demo.gif" width="300" alt="BabyBaton demo">
</p>

> **Note:** Demo GIF coming soon. To contribute one: record an iPhone screen capture, then convert with `ffmpeg -i recording.mov -vf "fps=15,scale=300:-1" docs/assets/demo.gif`.

## Features

- **Voice input** — tap to record, Whisper transcribes, Claude parses into structured activities
- **Manual entry fallback** — full manual entry modal when voice isn't available or fails
- **Care session tracking** — feeds (breast/bottle with amount), diaper changes (wet/dirty/both), sleep
- **Multi-caregiver handoffs** — see what the last caregiver did at a glance
- **Smart feed predictions** — rule-based predictions with local notifications 15 min before
- **Cross-platform** — iOS, Android, and Web via Expo
- **Family-based access** — create or join a family with a shared password

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Go 1.25+, [gqlgen](https://github.com/99designs/gqlgen), PostgreSQL 15 |
| Frontend | React Native 0.81 (Expo SDK 54), TypeScript, Apollo Client v4 |
| AI | OpenAI Whisper (transcription), Claude API (parsing) |
| Infrastructure | Docker, Railway, EAS (Expo Application Services) |

## Getting Started

### Prerequisites

- [Docker](https://www.docker.com/) (for PostgreSQL)
- [Go](https://go.dev/) 1.25+
- [Node.js](https://nodejs.org/) 20+
- Expo CLI (`npx expo`)

### Setup

```bash
# Clone the repo
git clone https://github.com/yourusername/babybaton.git
cd babybaton

# Start PostgreSQL
docker-compose up -d

# Apply migrations
cat migrations/*.sql | docker exec -i baby-baton-db psql -U postgres -d baby_baton

# Configure backend environment
# Create backend/.env with:
#   DATABASE_URL=postgres://postgres:postgres@localhost:5432/baby_baton?sslmode=disable
#   PORT=8080
#   CLAUDE_API_KEY=your-anthropic-key
#   OPENAI_API_KEY=your-openai-key

# Start the backend
cd backend
go run server.go
# Server runs on http://localhost:8080

# In a new terminal — start the frontend
cd frontend
npm install
npx expo start
# Opens Expo dev tools — press w for web, scan QR for device
```

## Project Structure

```
babybaton/
├── schema.graphql          # GraphQL schema — single source of truth
├── docker-compose.yml      # PostgreSQL container
├── migrations/             # SQL migrations (applied in order)
├── backend/
│   ├── server.go           # Entry point
│   ├── graph/              # GraphQL resolvers (gqlgen)
│   └── internal/           # Domain logic, AI clients, store
├── frontend/
│   ├── App.tsx             # Root component
│   ├── src/
│   │   ├── screens/        # Screen components
│   │   ├── components/     # Reusable UI components
│   │   ├── graphql/        # Apollo client, queries, mutations
│   │   └── ...
│   └── ...
└── docs/                   # Design docs
```

See [CLAUDE.md](CLAUDE.md) for detailed architecture, coding rules, and project conventions.

## Development

### Key Commands

| What | Command | Directory |
|------|---------|-----------|
| Start Postgres | `docker-compose up -d` | root |
| Run backend | `go run server.go` | `backend/` |
| Run frontend | `npx expo start` | `frontend/` |
| Backend tests | `go test -v -count=1 ./...` | `backend/` |
| Frontend tests | `npx jest` | `frontend/` |
| Typecheck | `npm run typecheck` | `frontend/` |
| GraphQL codegen (frontend) | `npx graphql-codegen --config codegen.ts` | `frontend/` |
| GraphQL codegen (backend) | `go run github.com/99designs/gqlgen generate` | `backend/` |
| Connect to DB | `docker exec -it baby-baton-db psql -U postgres -d baby_baton` | anywhere |

### Schema Change Workflow

All API changes start in `schema.graphql`:

1. Edit `schema.graphql`
2. Regenerate backend: `go run github.com/99designs/gqlgen generate` (in `backend/`)
3. Implement new resolvers in `backend/graph/schema.resolvers.go`
4. Regenerate frontend types: `npx graphql-codegen --config codegen.ts` (in `frontend/`)
5. Update queries/mutations in `frontend/src/graphql/`

See [CLAUDE.md](CLAUDE.md) for the full workflow and rules.

## Contributing

1. Fork the repo and create a feature branch (`git checkout -b my-feature`)
2. Make your changes following existing code patterns
3. Run tests before submitting:
   ```bash
   # Backend
   cd backend && go test -v -count=1 ./...

   # Frontend
   cd frontend && npx jest && npm run typecheck
   ```
4. Open a pull request against `main`

Guidelines:
- Follow existing code conventions (see [CLAUDE.md](CLAUDE.md))
- Write tests first — failing tests, then implementation
- Update [docs/baby_baton_design.md](docs/baby_baton_design.md) for significant feature or architectural changes
- Check [GitHub Issues](../../issues) for work to pick up

## Documentation

- [CLAUDE.md](CLAUDE.md) — Architecture, coding rules, dev setup, CI/CD
- [docs/baby_baton_design.md](docs/baby_baton_design.md) — Full product and technical design
- [docs/auth_migration_design.md](docs/auth_migration_design.md) — Auth migration design (device-based to Supabase)

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
