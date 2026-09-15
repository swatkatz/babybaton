#!/bin/bash
# scripts/prepare-app-store.sh
#
# Walks through everything needed to submit Baby Baton to App Store review,
# then triggers the app-store-submit GitHub Actions workflow.
#
# Run from repo root: bash scripts/prepare-app-store.sh

set -euo pipefail

REPO="swatkatz/babybaton"
WORKFLOW="app-store-submit.yml"
PRIMARY_LOCALE="en-CA"
FALLBACK_LOCALE="en-US"
METADATA_DIR="fastlane/metadata/${PRIMARY_LOCALE}"
FALLBACK_METADATA_DIR="fastlane/metadata/${FALLBACK_LOCALE}"
SCREENSHOTS_DIR="fastlane/screenshots/en-US"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

ok()   { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC}  $1"; }
err()  { echo -e "${RED}✗${NC} $1"; }
info() { echo -e "${BLUE}→${NC} $1"; }
step() { echo -e "\n${BOLD}$1${NC}"; }

echo -e "\n${BOLD}🍼 Baby Baton — App Store Submission Prep${NC}"
echo "────────────────────────────────────────────"
echo "This script checks all inputs and then triggers the GitHub Actions"
echo "workflow that uploads metadata, screenshots, and submits for review."

# ── 1. Prerequisites ──────────────────────────────────────────────────────────
step "Step 1: Prerequisites"

if ! command -v gh &>/dev/null; then
  err "GitHub CLI (gh) not found. Install it: brew install gh"
  exit 1
fi
ok "gh CLI found"

if ! gh auth status &>/dev/null; then
  err "Not authenticated with gh. Run: gh auth login"
  exit 1
fi
ok "gh authenticated"

# ── 2. Version ────────────────────────────────────────────────────────────────
step "Step 2: Version"

VERSION=$(node -p "require('./frontend/app.json').expo.version" 2>/dev/null || echo "")
if [ -z "$VERSION" ]; then
  err "Could not read version from frontend/app.json"
  exit 1
fi
ok "Submitting version: ${BOLD}v${VERSION}${NC}"

# ── 3. GitHub Secrets ─────────────────────────────────────────────────────────
step "Step 3: App Store Connect API credentials (GitHub secrets)"

SECRETS_OK=true
EXISTING_SECRETS=$(gh secret list --repo "$REPO" 2>/dev/null | awk '{print $1}')

for SECRET in ASC_KEY_ID ASC_ISSUER_ID ASC_KEY_CONTENT; do
  if echo "$EXISTING_SECRETS" | grep -q "^${SECRET}$"; then
    ok "$SECRET is set"
  else
    err "$SECRET is NOT set"
    SECRETS_OK=false
  fi
done

if [ "$SECRETS_OK" = false ]; then
  echo ""
  warn "You need to create an App Store Connect API key and add it as GitHub secrets."
  echo ""
  echo "  1. Go to: App Store Connect → Users & Access → Integrations → App Store Connect API"
  echo "  2. Click '+' to generate a new key (role: App Manager or Admin)"
  echo "  3. Download the .p8 file — you can only download it once"
  echo "  4. Note the Key ID and Issuer ID shown on the same page"
  echo "  5. Add secrets to GitHub:"
  echo ""
  echo "     gh secret set ASC_KEY_ID       --repo $REPO"
  echo "     gh secret set ASC_ISSUER_ID    --repo $REPO"
  echo "     gh secret set ASC_KEY_CONTENT  --repo $REPO \\"
  echo "       --body \"\$(base64 -i /path/to/AuthKey_XXXXXXXX.p8)\""
  echo ""
  read -rp "Press Enter once secrets are added, or Ctrl+C to exit..."
  echo ""

  # Re-check
  SECRETS_OK=true
  EXISTING_SECRETS=$(gh secret list --repo "$REPO" 2>/dev/null | awk '{print $1}')
  for SECRET in ASC_KEY_ID ASC_ISSUER_ID ASC_KEY_CONTENT; do
    if echo "$EXISTING_SECRETS" | grep -q "^${SECRET}$"; then
      ok "$SECRET is set"
    else
      err "$SECRET is still not set — exiting"
      SECRETS_OK=false
    fi
  done
  if [ "$SECRETS_OK" = false ]; then exit 1; fi
fi

# ── 4. Locale sync ───────────────────────────────────────────────────────────
step "Step 4: Locale sync (en-US -> en-CA)"

if [ ! -d "$METADATA_DIR" ]; then
  info "Creating ${PRIMARY_LOCALE} metadata directory..."
  mkdir -p "$METADATA_DIR"
fi

# Sync any missing en-CA files from en-US
SYNCED=0
for FILE in "$FALLBACK_METADATA_DIR"/*.txt; do
  BASENAME=$(basename "$FILE")
  TARGET="${METADATA_DIR}/${BASENAME}"
  if [ ! -f "$TARGET" ] || [ ! -s "$TARGET" ]; then
    cp "$FILE" "$TARGET"
    warn "Copied ${BASENAME} from ${FALLBACK_LOCALE} to ${PRIMARY_LOCALE}"
    SYNCED=$((SYNCED + 1))
  fi
done

if [ "$SYNCED" -eq 0 ]; then
  ok "${PRIMARY_LOCALE} metadata is complete (all files present)"
else
  ok "Synced ${SYNCED} file(s) from ${FALLBACK_LOCALE} to ${PRIMARY_LOCALE}"
fi

# Verify en-CA and en-US are in sync (warn on differences)
for FILE in "$METADATA_DIR"/*.txt; do
  BASENAME=$(basename "$FILE")
  US_FILE="${FALLBACK_METADATA_DIR}/${BASENAME}"
  if [ -f "$US_FILE" ] && ! diff -q "$FILE" "$US_FILE" &>/dev/null; then
    warn "${BASENAME} differs between ${PRIMARY_LOCALE} and ${FALLBACK_LOCALE}"
  fi
done

# ── 5. Metadata ───────────────────────────────────────────────────────────────
step "Step 5: App Store metadata"

METADATA_OK=true
EDITOR_CMD="${EDITOR:-nano}"

for FILE in description keywords release_notes support_url copyright; do
  PATH_TO_FILE="${METADATA_DIR}/${FILE}.txt"
  if [ ! -f "$PATH_TO_FILE" ] || [ ! -s "$PATH_TO_FILE" ]; then
    err "Missing or empty: $PATH_TO_FILE"
    METADATA_OK=false
  else
    ok "$FILE.txt"
  fi
done

if [ "$METADATA_OK" = false ]; then
  echo ""
  warn "Some metadata files are missing. Edit them now:"
  info "Files are in: ${METADATA_DIR}/"
  echo ""
  read -rp "Open metadata directory in your editor? [y/N] " OPEN_EDITOR
  if [[ "$OPEN_EDITOR" =~ ^[Yy]$ ]]; then
    "${EDITOR_CMD}" "${METADATA_DIR}"
  fi
  read -rp "Press Enter once metadata is ready, or Ctrl+C to exit..."
fi

echo ""
echo "  Current metadata:"
for FILE in name subtitle description keywords release_notes support_url copyright; do
  PATH_TO_FILE="${METADATA_DIR}/${FILE}.txt"
  if [ -f "$PATH_TO_FILE" ]; then
    PREVIEW=$(head -c 80 "$PATH_TO_FILE" | tr '\n' ' ')
    printf "  %-20s %s\n" "${FILE}:" "${PREVIEW}"
  fi
done

echo ""
read -rp "Metadata looks good? [y/N] " META_OK
if [[ ! "$META_OK" =~ ^[Yy]$ ]]; then
  info "Edit ${METADATA_DIR}/ then re-run this script."
  exit 0
fi

# ── 6. Screenshots ────────────────────────────────────────────────────────────
step "Step 6: Screenshots"

SCREENSHOT_COUNT=$(find "$SCREENSHOTS_DIR" -name "*.png" -o -name "*.jpg" | wc -l | tr -d ' ')

if [ "$SCREENSHOT_COUNT" -eq 0 ]; then
  warn "No screenshots found in ${SCREENSHOTS_DIR}/"
  echo ""
  echo "  To capture screenshots:"
  echo ""
  echo "  1. Open Simulator:"
  echo "     open -a Simulator"
  echo ""
  echo "  2. Boot a 6.7\" display device (required by App Store):"
  echo "     xcrun simctl boot 'iPhone 17 Pro Max' 2>/dev/null || true"
  echo ""
  echo "  3. In the Simulator, navigate to each screen you want to capture."
  echo "     Take a screenshot with Cmd+S (saves to ~/Desktop)."
  echo ""
  echo "  4. Copy screenshots here:"
  echo "     cp ~/Desktop/Simulator*.png ${SCREENSHOTS_DIR}/"
  echo ""
  echo "  Apple requires at least one screenshot for the 6.7\" iPhone display."
  echo "  Name files descriptively — deliver matches by image dimensions."
  echo ""
  read -rp "Skip screenshots for now and submit metadata only? [y/N] " SKIP_SHOTS
  if [[ "$SKIP_SHOTS" =~ ^[Yy]$ ]]; then
    warn "Submitting without screenshots. You'll need to add them in App Store Connect before approval."
    SKIP_SCREENSHOTS=true
  else
    info "Add screenshots to ${SCREENSHOTS_DIR}/ then re-run this script."
    exit 0
  fi
else
  ok "${SCREENSHOT_COUNT} screenshot(s) found"
  find "${SCREENSHOTS_DIR}" \( -name "*.png" -o -name "*.jpg" \) -print0 | while IFS= read -r -d '' f; do
    echo "    $(basename "$f")"
  done
  SKIP_SCREENSHOTS=false
fi

# ── 7. Resize screenshots ───────────────────────────────────────────────────
if [ "$SKIP_SCREENSHOTS" = false ] && command -v sips &>/dev/null; then
  step "Step 7: Resize screenshots to App Store dimensions"

  # Expected dimensions:
  #   iPhone 6.7"  — 1284 x 2778
  #   iPad 12.9"   — 2048 x 2732
  IPHONE_W=1284; IPHONE_H=2778
  IPAD_W=2048;   IPAD_H=2732

  RESIZED=0
  find "${SCREENSHOTS_DIR}" \( -name "*.png" -o -name "*.jpg" \) -print0 | while IFS= read -r -d '' f; do
    W=$(sips -g pixelWidth "$f" 2>/dev/null | tail -1 | awk '{print $2}')
    H=$(sips -g pixelHeight "$f" 2>/dev/null | tail -1 | awk '{print $2}')

    # Determine target: iPad if width > 1500, else iPhone
    if [ "$W" -gt 1500 ]; then
      TW=$IPAD_W; TH=$IPAD_H
    else
      TW=$IPHONE_W; TH=$IPHONE_H
    fi

    if [ "$W" -ne "$TW" ] || [ "$H" -ne "$TH" ]; then
      info "Resizing $(basename "$f"): ${W}x${H} -> ${TW}x${TH}"
      sips --resampleHeightWidth "$TH" "$TW" "$f" >/dev/null 2>&1
      RESIZED=$((RESIZED + 1))
    fi
  done

  if [ "$RESIZED" -eq 0 ]; then
    ok "All screenshots already at correct dimensions"
  else
    ok "Resized ${RESIZED} screenshot(s)"
  fi
else
  if [ "$SKIP_SCREENSHOTS" = false ]; then
    warn "sips not available (not macOS?) — skipping screenshot resize"
    warn "Ensure screenshots are 1284x2778 (iPhone) or 2048x2732 (iPad) before submitting"
  fi
fi

# ── 8. Build availability ─────────────────────────────────────────────────────
step "Step 8: Verify build is on TestFlight"

echo ""
echo "  The GitHub Actions build must have finished and appeared in TestFlight"
echo "  before submitting for review."
echo ""
echo "  Check: https://appstoreconnect.apple.com/apps/6761305123/testflight/ios"
echo ""
read -rp "Confirmed the v${VERSION} build is visible in TestFlight? [y/N] " BUILD_READY
if [[ ! "$BUILD_READY" =~ ^[Yy]$ ]]; then
  info "Wait for the EAS build to complete and appear in TestFlight, then re-run."
  echo ""
  echo "  Check build status:"
  echo "  gh run list --repo $REPO --workflow eas-build.yml --limit 3"
  exit 0
fi
ok "Build confirmed on TestFlight"

# ── 9. Commit and trigger ─────────────────────────────────────────────────────
step "Step 9: Commit metadata and trigger submission"

echo ""
info "Staging fastlane/ changes..."
git add fastlane/

if git diff --cached --quiet; then
  ok "No changes to commit (metadata already up to date)"
else
  git diff --cached --stat
  echo ""
  read -rp "Commit these changes? [y/N] " DO_COMMIT
  if [[ "$DO_COMMIT" =~ ^[Yy]$ ]]; then
    git commit -m "chore: update App Store metadata for v${VERSION}"
    git push origin main
    ok "Committed and pushed"
  else
    warn "Skipping commit — triggering workflow with current remote state."
  fi
fi

echo ""
read -rp "Run as dry-run (upload metadata without submitting for review)? [y/N] " DRY_RUN
DRY_RUN_FLAG="false"
if [[ "$DRY_RUN" =~ ^[Yy]$ ]]; then
  DRY_RUN_FLAG="true"
  warn "Dry-run mode — will upload metadata but NOT submit for review"
fi

info "Triggering ${WORKFLOW} for v${VERSION} (dry_run=${DRY_RUN_FLAG})..."
gh workflow run "$WORKFLOW" \
  --repo "$REPO" \
  --field "version=${VERSION}" \
  --field "dry_run=${DRY_RUN_FLAG}"

echo ""
ok "Workflow triggered!"
echo ""
echo "  Monitor progress:"
echo "  gh run list --repo $REPO --workflow $WORKFLOW --limit 3"
echo "  gh run watch --repo $REPO"
echo ""
echo "  Once the workflow completes, check App Store Connect for the submission:"
echo "  https://appstoreconnect.apple.com/apps/6761305123/distribution/ios/version/inflight"
echo ""
echo -e "${BOLD}Good luck with the review! 🍼${NC}"
