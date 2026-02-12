# BabyBaton Frontend: Build, Deploy & Distribution Research

## 1. Current State

### What exists today

**eas.json** — Two build profiles:
- `preview`: internal distribution, APK for Android, channel `preview`, hardcoded prod API URL
- `production`: store distribution, channel `production`, hardcoded prod API URL

**app.json** — Expo config:
- `runtimeVersion.policy: "sdkVersion"` — runtime version tied to Expo SDK version
- `updates.url` pointing to EAS Update server (`https://u.expo.dev/b2d489b0-...`)
- Project ID: `b2d489b0-bbc5-4079-861e-b1187d6570d6`, Owner: `swatkatz`

**CI (.github/workflows/ci.yml)** — GitHub Actions on push/PR to main:
- Frontend: `npm ci` → `npm run typecheck` → `npm test --ci`
- Backend: migrations → `go build` → `go test`
- **No EAS Build or EAS Update in CI** — all frontend deploys are manual

**API URL resolution (src/config.ts)**:
1. `EXPO_PUBLIC_API_URL` env var (set at build time by EAS) → `/query`
2. `Constants.expoConfig.extra.apiUrl` → `/query`
3. Fallback: `http://localhost:8080/query`

**Current manual workflow**:
- Local dev: `npx expo start` (Expo Go)
- OTA update: `npx eas update --channel production --message "..."`
- Native build: `npx eas build --profile preview --platform android/ios`

### Problems
1. **Manual deploys** — every frontend change requires running `npx eas update` by hand
2. **No build automation** — native builds are manual, no CI trigger
3. **Confusing profiles** — `preview` and `production` overlap; unclear when to use which
4. **No development build** — Expo Go limits native library testing
5. **Sharing is manual** — copy/paste build URLs to family
6. **No PR previews** — can't test changes before merging
7. **No test gate** — updates go straight to family with no review step

---

## 2. Expo Core Concepts

### Builds vs Updates

| | **EAS Build** | **EAS Update** |
|---|---|---|
| What | Compiles native binary (APK/IPA) | Pushes JS bundle + assets OTA |
| When needed | Native code changes, SDK upgrades, new native libs | JS/TS changes, UI tweaks, bug fixes |
| Speed | Minutes (queued cloud build) | Seconds |
| Requires | Cloud build infrastructure | `expo-updates` in the binary |
| Distribution | Install new binary | Auto-delivered on next app launch |

**Key insight**: Build the native shell once, then push many OTA updates to it. Only rebuild when native code changes.

### Runtime Versions

Runtime versions ensure an OTA update is compatible with the installed native binary.

| Policy | Description | Tradeoff |
|---|---|---|
| `sdkVersion` | Runtime version = Expo SDK version | Simple but coarse — any SDK bump triggers new build |
| `appVersion` | Runtime version = app version from app.json | Manual — must remember to bump |
| `fingerprint` | Auto-computed hash of all native dependencies | Most protective — auto-detects when rebuild needed |
| `nativeVersion` | Uses native version codes | Platform-specific |

**Recommendation**: Switch to `fingerprint` policy. It automatically determines when a new native build is required vs when an OTA update suffices.

### Channels & Branches

- **Channel**: A deployment target assigned to a build profile (e.g., `production`, `preview`)
- **Branch**: Where updates are published (e.g., `main`, `feature-x`)
- Channels map to branches. A build on the `preview` channel receives updates published to the `preview` branch.

### Development Builds vs Expo Go

| | **Expo Go** | **Development Build** |
|---|---|---|
| What | Pre-built sandbox app | Custom debug build with `expo-dev-client` |
| Native libs | Only what Expo bundles | Any native lib you install |
| Customization | None | Full (icons, splash, deep links, push) |
| OTA updates | No | Yes — can preview EAS updates |
| Setup | Zero | One-time build |

**Recommendation**: Create a development build for local dev. Enables testing OTA updates locally, supports all native libs, and matches production behavior.

### Continuous Native Generation (CNG)

Expo uses CNG via `npx expo prebuild` to generate `ios/` and `android/` directories from `app.json` config + plugins. These are gitignored and regenerated as needed. EAS Build runs prebuild automatically.

---

## 3. Recommended Build Profiles (eas.json)

Consolidate into three clear profiles:

| Profile | Purpose | Distribution | Channel | Dev Client |
|---|---|---|---|---|
| `development` | Local dev on device/emulator | internal | `development` | Yes |
| `preview` | Share with family for testing | internal | `preview` | No (release) |
| `production` | App store submission (future) | store | `production` | No |

```jsonc
{
  "cli": { "version": ">= 16.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "channel": "development",
      "ios": { "simulator": true },
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

---

## 4. Local Development Flow

**One-time setup**:
```sh
npx expo install expo-dev-client
eas build --profile development --platform ios   # or android
# Install the built app on device/simulator
```

**Daily dev**:
```sh
npx expo start
```
Automatically targets the development build (not Expo Go). Live reload, full native lib support.

**Alternative (fully local, no EAS)**:
```sh
npx expo run:ios --device    # requires Xcode
npx expo run:android         # requires Android Studio
```

---

## 5. Family Distribution Flow

**One-time**: Build the preview binary:
```sh
eas build --profile preview --platform all
```
Share the build URL with family. They install once.
- **Android**: direct APK download
- **iOS**: ad hoc provisioning (register device UDIDs via `eas device:create`, limited to 100 devices/year, requires paid Apple Developer account $99/year)

**Ongoing**: Push JS updates (no reinstall needed):
```sh
eas update --channel preview --message "description"
```
Family gets the update on next app launch.

---

## 6. CI/CD Automation (GitHub Actions)

### Workflow 1: PR Preview (test gate)

Publishes a preview update on every PR with a QR code comment. Developer scans QR on their dev build to test before merging.

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

### Workflow 2: Deploy on merge to main

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

### Workflow 3: Manual native build (when needed)

Triggered manually from GitHub Actions UI when native dependencies change.

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

---

## 7. Runtime Version Strategy

**Current**: `"runtimeVersion": { "policy": "sdkVersion" }`
- Only changes when Expo SDK is upgraded. Too coarse — adding a native lib without SDK upgrade could cause incompatible OTA updates.

**Recommended**: Switch to `fingerprint`:
```json
{
  "runtimeVersion": {
    "policy": "fingerprint"
  }
}
```
Auto-hashes all native dependencies. When native deps change → fingerprint changes → new build required. When only JS changes → fingerprint stays → OTA updates work.

---

## 8. Target Workflow

```
Developer creates PR
        │
        ▼
GitHub Actions: PR Preview
  - Publishes preview update
  - Posts QR code comment on PR
        │
        ▼
Developer scans QR on dev build
  - Tests changes on real device
  - Iterates if needed (push more commits → new preview)
        │
        ▼
Developer merges PR to main
        │
        ▼
GitHub Actions: Deploy Frontend
  - Publishes OTA update to `preview` channel
        │
        ▼
Family devices auto-update on next launch
  (no reinstall needed)

─── Occasionally (native deps change) ───

Developer triggers manual EAS Build
  (GitHub Actions workflow_dispatch)
        │
        ▼
EAS Build compiles new binary
        │
        ▼
Share build URL with family → they install once
```

---

## 9. Setup Steps (ordered)

1. **Generate EXPO_TOKEN**: https://expo.dev/settings/access-tokens → create token → add as GitHub secret `EXPO_TOKEN`
2. **Install expo-dev-client**: `npx expo install expo-dev-client`
3. **Update eas.json**: Consolidate to 3 profiles (development, preview, production)
4. **Update app.json**: Switch `runtimeVersion` to `fingerprint` policy
5. **Add GitHub Actions workflows**: `preview.yml`, `deploy-frontend.yml`, `eas-build.yml`
6. **Build development binary**: `eas build --profile development --platform ios` (for local dev)
7. **Build preview binary**: `eas build --profile preview --platform all` (for family)
8. **Register family iOS devices**: `eas device:create` for each iPhone
9. **Share preview build URL** with family → they install once
10. **Test the flow**: create a PR → verify QR code → merge → verify family update

---

## 10. iOS Distribution Notes

- **Ad hoc provisioning**: Requires paid Apple Developer account ($99/year). Limited to 100 device UDIDs per year.
- **Register devices**: Each family member opens a URL from `eas device:create` on their iPhone to register their UDID.
- **After registration**: Rebuild with `eas build --profile preview --platform ios` (new UDID included in provisioning).
- **TestFlight** (future alternative): If you submit to App Store, TestFlight allows up to 10,000 external testers without UDID management, but requires App Store review.
- **Android**: Just share the APK URL. No special provisioning needed.

---

## References

- [EAS Build Introduction](https://docs.expo.dev/build/introduction/)
- [EAS Update Introduction](https://docs.expo.dev/eas-update/introduction/)
- [Internal Distribution](https://docs.expo.dev/build/internal-distribution/)
- [eas.json Reference](https://docs.expo.dev/eas/json/)
- [GitHub Actions for EAS Update](https://docs.expo.dev/eas-update/github-actions/)
- [Building on CI](https://docs.expo.dev/build/building-on-ci/)
- [Development Builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [Runtime Versions](https://docs.expo.dev/eas-update/runtime-versions/)
- [Share Previews with Team](https://docs.expo.dev/review/share-previews-with-your-team/)
- [Preview Updates in Dev Builds](https://docs.expo.dev/eas-update/expo-dev-client/)
- [Local App Development](https://docs.expo.dev/guides/local-app-development/)
- [Continuous Native Generation](https://docs.expo.dev/workflow/continuous-native-generation/)
- [EAS Workflows](https://docs.expo.dev/eas/workflows/get-started/)
