# BabyBaton Frontend: Implementation Plan

Each task below is a separate PR. Tasks are ordered by dependency.

---

## Task 1: Consolidate eas.json + update runtime version policy

**Goal**: Replace the confusing 2-profile eas.json with 3 clear profiles, and switch runtime version from `sdkVersion` to `fingerprint` for safer OTA updates.

**Why first**: Every subsequent task (dev builds, CI, family distribution) depends on having the right build profiles in place.

**Profiles**:

| Profile       | Purpose                           | When to use                                                                                                                                      |
| ------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `development` | Local dev on your physical iPhone | Day-to-day coding. Includes dev tools (shake menu, network inspector). Points to `localhost:8080`. Builds in EAS cloud, installs on your device. |
| `preview`     | Share with family for testing     | After merging PRs. Internal distribution (APK/ad-hoc IPA). Points to Railway prod API. Family installs once, gets OTA updates.                   |
| `production`  | App store submission (future)     | When you want to publish to App Store / Play Store. Points to Railway prod API.                                                                  |

**Files changed**:

- `frontend/eas.json`
- `frontend/app.json`

**Changes to `eas.json`** — replace entire contents with:

```json
{
  "cli": { "version": ">= 16.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "channel": "development",
      "env": {
        "EXPO_PUBLIC_API_URL": "http://localhost:8080"
      }
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview",
      "android": { "buildType": "apk" },
      "env": {
        "EXPO_PUBLIC_API_URL": "https://babybaton-production.up.railway.app"
      }
    },
    "production": {
      "channel": "production",
      "env": {
        "EXPO_PUBLIC_API_URL": "https://babybaton-production.up.railway.app"
      }
    }
  }
}
```

**Changes to `app.json`** — update `runtimeVersion`:

```json
"runtimeVersion": {
  "policy": "fingerprint"
}
```

This auto-hashes all native dependencies. When only JS changes, OTA updates work. When native deps change, the fingerprint changes and a new build is required — preventing incompatible updates.

**How to use each profile**:

```sh
# DEVELOPMENT — build a dev client for your physical iPhone (one-time)
eas build --profile development --platform ios
# Install the build on your iPhone via the link EAS gives you
# Then daily dev is just:
npx expo start

# PREVIEW — build the app for family (one-time, or when native deps change)
eas build --profile preview --platform ios      # ad-hoc IPA for iPhones
eas build --profile preview --platform android  # APK for Android
# Push OTA updates to family (no rebuild needed):
eas update --channel preview --message "fixed bug X"

# PRODUCTION — build for App Store / Play Store (future)
eas build --profile production --platform all
```

**Verification**:

```sh
# Validate eas.json is parseable
npx eas-cli config
# Run existing tests to make sure nothing breaks
npm test
```

**Notes / Comments**:
You can keep using npx expo start if you don't have any native libraries like react-native-firebase etc.
But, since we didn't want to be piegonholed, we removed that option

---

## Task 2: Install expo-dev-client + generate EXPO_TOKEN

**Goal**: Install the dev client library (required for the `development` build profile from Task 1) and create the EXPO_TOKEN GitHub secret (required for all CI workflows in later tasks).

**Depends on**: Task 1

**Step 1 — Install expo-dev-client** (from research.md Section 4):
```sh
npx expo install expo-dev-client
```

**Step 2 — Generate EXPO_TOKEN** (from research.md Section 9, step 1):
1. Go to https://expo.dev/settings/access-tokens → create token
2. Add as GitHub secret `EXPO_TOKEN` at https://github.com/swatkatz/babybaton/settings/secrets/actions

**Files changed in PR**:
- `frontend/package.json`
- `frontend/package-lock.json`

**Verification**:
```sh
npm test
```

**Notes / Comments**:
<!-- Add your comments here -->

---

## Task 3: Add GitHub Actions CI/CD workflows

**Goal**: Automate frontend deploys with 3 GitHub Actions workflows: PR preview (test gate), deploy on merge, and manual native build.

**Depends on**: Task 2 (EXPO_TOKEN must exist as a GitHub secret)

**Files added** (from research.md Section 6):
- `.github/workflows/preview.yml` — PR Preview (test gate)
- `.github/workflows/deploy-frontend.yml` — Deploy OTA update on merge to main
- `.github/workflows/eas-build.yml` — Manual native build trigger

**Workflow 1: PR Preview** (research.md Section 6, Workflow 1)

Publishes a preview update on every PR with a QR code comment. You scan QR on your dev build to test before merging.

```yaml
# .github/workflows/preview.yml
name: PR Preview
on:
  pull_request:
    types: [opened, synchronize]
    paths:
      - 'frontend/**'

jobs:
  preview:
    name: Publish Preview
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: frontend/package-lock.json
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: npm ci
      - uses: expo/expo-github-action/preview@v8
        with:
          command: eas update --auto
          working-directory: frontend
```

**Workflow 2: Deploy on merge to main** (research.md Section 6, Workflow 2)

Auto-publishes OTA update to the `preview` channel when code lands on main. Family devices pick it up on next launch.

```yaml
# .github/workflows/deploy-frontend.yml
name: Deploy Frontend
on:
  push:
    branches: [main]
    paths:
      - 'frontend/**'

jobs:
  update:
    name: Publish EAS Update
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: frontend/package-lock.json
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: npm ci
      - run: eas update --channel preview --message "${{ github.event.head_commit.message }}" --non-interactive
```

**Workflow 3: Manual native build** (research.md Section 6, Workflow 3)

Triggered manually from the GitHub Actions UI (`workflow_dispatch`). You only need this when the native shell changes — most code changes are JS-only and get deployed as OTA updates via Workflow 2.

**When to trigger a manual build** (from research.md Section 2, Builds vs Updates):
- You add a new native library (e.g. `npx expo install react-native-maps`)
- You upgrade the Expo SDK (e.g. SDK 54 → 55)
- You change native config in `app.json` (e.g. new permission, bundle ID, app icon)
- The `fingerprint` runtime version changes (EAS will warn you if an OTA update is incompatible)

**When you do NOT need a build** (OTA update via Workflow 2 is enough):
- JS/TS code changes (new screens, bug fixes, UI tweaks)
- Styling changes
- Adding pure-JS libraries (e.g. `date-fns`, `lodash`)
- GraphQL query/mutation changes

```yaml
# .github/workflows/eas-build.yml
name: EAS Build
on:
  workflow_dispatch:
    inputs:
      platform:
        description: 'Platform'
        required: true
        default: 'all'
        type: choice
        options: [all, ios, android]
      profile:
        description: 'Profile'
        required: true
        default: 'preview'
        type: choice
        options: [preview, production]

jobs:
  build:
    name: Build Native App
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: frontend/package-lock.json
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: npm ci
      - run: eas build --platform ${{ inputs.platform }} --profile ${{ inputs.profile }} --non-interactive --no-wait
```

**Verification**:
- Push a test PR with a small frontend change → confirm QR code comment appears
- Merge the PR → confirm EAS Update publishes to `preview` channel
- Go to GitHub Actions tab → manually trigger EAS Build → confirm build starts on expo.dev

**Notes / Comments**:
<!-- Add your comments here -->

---

## Task 4: Build binaries + distribute to family

**Goal**: Build the native binaries for your dev device and for family, register family iOS devices, and share the app.

**Depends on**: Tasks 1-3 (profiles, expo-dev-client, and EXPO_TOKEN must be in place)

**Not a PR** — this is a series of manual commands you run.

**Step 0 — Apple Developer Account** (prerequisite for iOS distribution):

You need a paid Apple Developer account for ad hoc iOS distribution (research.md Section 10).
1. Go to https://developer.apple.com/programs/
2. Click "Enroll" and sign in with your Apple ID
3. Enroll as an Individual ($99/year, billed upfront)
4. Enrollment can take up to 48 hours to process
5. Once approved, EAS Build can automatically manage signing certificates and provisioning profiles for you

**Step 1 — Build your development binary** (research.md Section 4):
```sh
eas build --profile development --platform ios
# EAS gives you a URL — open it on your iPhone to install
```
After this, daily dev is just `npx expo start`.

**Step 2 — Register family iOS devices** (research.md Section 10):

Each family member needs their device UDID registered with your Apple Developer account. For each iPhone:
```sh
eas device:create
# This generates a URL — send it to the family member
# They open it on their iPhone to register their UDID
```
- Limited to 100 device UDIDs per year
- Android does not need this step

**Step 3 — Build the preview binary for family** (research.md Section 5):
```sh
# Must run AFTER registering iOS devices (UDIDs get baked into the provisioning profile)
eas build --profile preview --platform ios      # ad-hoc IPA for iPhones
eas build --profile preview --platform android  # APK for Android
```
EAS gives you a URL for each build. Share these with family — they install once.

**Step 4 — Verify family can receive OTA updates** (research.md Section 5):
```sh
# Push a test update
eas update --channel preview --message "test update"
```
Family members close and reopen the app — they should get the update on next launch.

**Verification**:
- Your dev build installs and connects to `npx expo start`
- Family members can install the preview build via the shared URL
- After `eas update`, family sees the updated app on relaunch

**Notes / Comments**:
<!-- Add your comments here -->

---

## Task 5: End-to-end test of the full workflow

**Goal**: Verify the entire pipeline works end-to-end by walking through the target workflow from research.md Section 8.

**Depends on**: Tasks 1-4 (everything must be in place)

**Not a PR** — this is a manual walkthrough.

**Test change**: Change the section title in `DashboardScreen.tsx` from `"Recent Care Sessions"` to `"Latest Care Sessions"`. Small, visible, easy to verify.

**Step 1 — Test the PR preview flow**:
1. Create a branch: `git checkout -b test/e2e-workflow`
2. Edit `frontend/src/screens/DashboardScreen.tsx` line 185 — change `Recent Care Sessions` to `Latest Care Sessions`
3. Commit and push: `git add -A && git commit -m "test: rename section heading" && git push -u origin test/e2e-workflow`
4. Open a PR against `main` on GitHub
5. Wait for the PR Preview GitHub Action to run
6. Confirm a comment appears on the PR with a QR code
7. Scan the QR code on your development build → verify the heading says "Latest Care Sessions"

**Step 2 — Test the deploy-on-merge flow**:
1. Merge the PR to `main`
2. Wait for the Deploy Frontend GitHub Action to run
3. Confirm EAS Update publishes to the `preview` channel (check https://expo.dev dashboard)
4. Ask a family member to close and reopen the app → verify the heading changed

**Step 3 — Test the manual build flow**:
1. Go to https://github.com/swatkatz/babybaton/actions → select "EAS Build"
2. Click "Run workflow" → choose platform: `all`, profile: `preview`
3. Confirm the build starts on https://expo.dev

**What success looks like** (research.md Section 8):
```
PR opened        → QR code comment appears, you can test on your device
PR merged        → OTA update auto-published, family gets it on relaunch
Manual build     → new native binary built in cloud, shareable URL generated
```

**Notes / Comments**:
<!-- Add your comments here -->
