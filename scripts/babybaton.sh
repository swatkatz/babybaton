#!/bin/bash
# scripts/babybaton.sh
#
# One-stop CLI for the Baby Baton release workflow.
# Run from repo root: bash scripts/babybaton.sh <command>
#
# Or add an alias: alias babybaton='bash /path/to/babybaton/scripts/babybaton.sh'

set -euo pipefail

REPO="swatkatz/babybaton"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

ok()   { echo -e "  ${GREEN}✓${NC} $1"; }
warn() { echo -e "  ${YELLOW}⚠${NC}  $1"; }
err()  { echo -e "  ${RED}✗${NC} $1"; }
info() { echo -e "  ${BLUE}→${NC} $1"; }

# ══════════════════════════════════════════════════════════════════════════════
# help
# ══════════════════════════════════════════════════════════════════════════════
cmd_help() {
  cat <<'EOF'

  🍼 Baby Baton — Release Workflow
  ════════════════════════════════════════════════════════════════

  COMMANDS
    babybaton status     Check running builds, current version, useful URLs
    babybaton build      Trigger a TestFlight or App Store build
    babybaton submit     Upload metadata + screenshots, submit for App Store review
    babybaton help       Show this guide

  QUICK REFERENCE
    Web app (frontend):  https://baby-baton-production.up.railway.app
    Backend API:         https://babybaton-production.up.railway.app
    App Store Connect:   https://appstoreconnect.apple.com/apps/6761305123/distribution/ios/version/inflight
    TestFlight:          https://appstoreconnect.apple.com/apps/6761305123/testflight

  HOW DEPLOYMENT WORKS
    Merge a PR to main → CI runs → backend + web auto-deploy to Railway.
    Native iOS changes need a separate build (see below).

  RELEASE WORKFLOW
  ────────────────────────────────────────────────────────────────

    ┌─ 1. Code Change ─────────────────────────────────────────┐
    │  Push to main / merge PR                                 │
    │  CI runs, then auto-deploys:                             │
    │    • Backend → Railway                                   │
    │    • Web frontend → Railway                              │
    │  Test: https://baby-baton-production.up.railway.app      │
    └──────────────────────────────────────────────────────────┘
                            │
                            ▼
    ┌─ 2. TestFlight Build (babybaton build) ──────────────────┐
    │  For JS-only changes: OTA update pushes automatically.   │
    │  For native changes: need a new build.                   │
    │                                                          │
    │  Preview build → lands in TestFlight (~20 min)           │
    │  Production build → also bumps version + tags release    │
    └──────────────────────────────────────────────────────────┘
                            │
                            ▼
    ┌─ 3. App Store Submission (babybaton submit) ─────────────┐
    │  Requires: production build visible in TestFlight        │
    │  Requires: App Store Connect API key (one-time setup)    │
    │                                                          │
    │  Uploads metadata + screenshots via Fastlane             │
    │  Submits for Apple review                                │
    └──────────────────────────────────────────────────────────┘

  WHEN TESTFLIGHT EXPIRES
    TestFlight builds expire after 90 days. To refresh:
      babybaton build → pick "preview"
    This creates a new build on the same channel.

EOF
}

# ══════════════════════════════════════════════════════════════════════════════
# status
# ══════════════════════════════════════════════════════════════════════════════
cmd_status() {
  echo ""
  echo -e "  ${BOLD}Baby Baton Status${NC}"
  echo "  ────────────────────────────────────────"

  # Version
  VERSION=$(node -p "require('$REPO_ROOT/frontend/app.json').expo.version" 2>/dev/null || echo "unknown")
  echo -e "  Version:     ${BOLD}v${VERSION}${NC}"
  echo ""

  # URLs
  echo "  URLs:"
  echo "    Web app:           https://baby-baton-production.up.railway.app"
  echo "    Backend:           https://babybaton-production.up.railway.app"
  echo "    App Store Connect: https://appstoreconnect.apple.com/apps/6761305123/distribution/ios/version/inflight"
  echo ""

  # Recent workflow runs
  echo "  Recent GitHub Actions runs:"
  echo ""
  gh run list --repo "$REPO" --limit 5 | while IFS= read -r line; do
    echo "    $line"
  done
  echo ""
}

# ══════════════════════════════════════════════════════════════════════════════
# build
# ══════════════════════════════════════════════════════════════════════════════
cmd_build() {
  echo ""
  echo -e "  ${BOLD}Baby Baton — Trigger Build${NC}"
  echo "  ────────────────────────────────────────"

  VERSION=$(node -p "require('$REPO_ROOT/frontend/app.json').expo.version" 2>/dev/null || echo "unknown")
  echo -e "  Current version: ${BOLD}v${VERSION}${NC}"
  echo ""

  echo "  What kind of build?"
  echo ""
  echo "    1) TestFlight (preview)"
  echo "       → Internal testing. Builds the app and uploads to TestFlight."
  echo "       → Use for: testing on a real device, refreshing an expired build."
  echo ""
  echo "    2) App Store (production)"
  echo "       → Bumps the version, creates a GitHub release, builds, and uploads."
  echo "       → Use for: releasing a new version to the App Store."
  echo "       → After this, run 'babybaton submit' to submit for review."
  echo ""
  read -rp "  Pick [1/2]: " BUILD_TYPE

  case "$BUILD_TYPE" in
    1)
      echo ""
      echo -e "  ${BOLD}TestFlight (preview) build${NC}"
      echo ""
      read -rp "  Platform? [ios/android/all] (default: ios): " PLATFORM
      PLATFORM=${PLATFORM:-ios}

      echo ""
      info "Triggering EAS build (profile=preview, platform=$PLATFORM)..."
      gh workflow run eas-build.yml \
        --repo "$REPO" \
        --field "platform=$PLATFORM" \
        --field "profile=preview"

      echo ""
      ok "Build triggered!"
      echo ""
      echo "  What happens next:"
      echo "    1. EAS builds the app (~15-20 min)"
      echo "    2. Binary auto-uploads to TestFlight"
      echo "    3. TestFlight processes it (~5-10 min more)"
      echo ""
      echo "  Monitor:"
      echo "    gh run list --repo $REPO --workflow eas-build.yml --limit 3"
      echo "    gh run watch --repo $REPO"
      echo ""
      echo "  TestFlight: https://appstoreconnect.apple.com/apps/6761305123/testflight/ios"
      echo ""
      ;;

    2)
      echo ""
      echo -e "  ${BOLD}App Store (production) build${NC}"
      echo ""
      echo "  This will:"
      echo "    • Bump version in app.json + package.json"
      echo "    • Create a git tag + GitHub release"
      echo "    • Build a production binary via EAS"
      echo "    • Upload to TestFlight (eas submit)"
      echo ""
      read -rp "  New version? (leave empty to auto-increment patch from v$VERSION): " NEW_VERSION

      read -rp "  Platform? [ios/android/all] (default: ios): " PLATFORM
      PLATFORM=${PLATFORM:-ios}

      echo ""
      ARGS="--field platform=$PLATFORM"
      if [ -n "$NEW_VERSION" ]; then
        ARGS="$ARGS --field version=$NEW_VERSION"
      fi

      info "Triggering release workflow..."
      gh workflow run release.yml \
        --repo "$REPO" \
        $ARGS

      echo ""
      ok "Release workflow triggered!"
      echo ""
      echo "  What happens next:"
      echo "    1. Version bumped, tag created, GitHub release published"
      echo "    2. EAS builds the production binary (~15-20 min)"
      echo "    3. Binary auto-uploads to TestFlight"
      echo ""
      echo "  Once the build is on TestFlight, run:"
      echo "    babybaton submit"
      echo ""
      echo "  Monitor:"
      echo "    gh run list --repo $REPO --workflow release.yml --limit 3"
      echo "    gh run watch --repo $REPO"
      echo ""
      ;;

    *)
      err "Invalid choice. Pick 1 or 2."
      exit 1
      ;;
  esac
}

# ══════════════════════════════════════════════════════════════════════════════
# submit
# ══════════════════════════════════════════════════════════════════════════════
cmd_submit() {
  # Delegate to the dedicated submission script
  bash "$SCRIPT_DIR/prepare-app-store.sh"
}

# ══════════════════════════════════════════════════════════════════════════════
# main
# ══════════════════════════════════════════════════════════════════════════════

# Ensure we're in the repo root
cd "$REPO_ROOT"

COMMAND="${1:-help}"

case "$COMMAND" in
  help|--help|-h)
    cmd_help
    ;;
  status)
    cmd_status
    ;;
  build)
    cmd_build
    ;;
  submit)
    cmd_submit
    ;;
  *)
    echo ""
    err "Unknown command: $COMMAND"
    echo ""
    echo "  Usage: babybaton <command>"
    echo "  Commands: help, status, build, submit"
    echo ""
    exit 1
    ;;
esac
