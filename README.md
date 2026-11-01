# Trakn

A local-first React Native student planner for class schedules, registration-document scanning, weekly budgeting, and school dues. Source and native project directories retain the older MyAkan name.

## Development

Run commands from this directory (`C:\my-akan\MyAkan`), which contains `package.json`.

Prerequisites: Node.js 18 or later, npm, and the React Native 0.76 native development toolchain. Android requires the Android SDK and JDK; iOS requires macOS, Xcode, Ruby/Bundler, and CocoaPods.

```sh
npm ci
npm start
```

In another terminal:

```sh
npm run android
# On macOS, after installing the iOS pods:
npm run ios
```

For iOS dependency setup, run `bundle install` here, then `bundle exec pod install` from `ios/`. Android widgets require an Android device/emulator; SQLite, camera/OCR, and reminders require a native build.

## Verification

```sh
npm run typecheck
npm test -- --runInBand
npm run lint
```

The tests exercise schedule rules, OCR text parsing, the schedule repository with WatermelonDB's in-memory LokiJS adapter, integration coordination, reminder timing, and the app shell. They do not validate native SQLite, device permissions, image recognition accuracy, or Android widget rendering.

## Code map

| Location | Responsibility |
| --- | --- |
| `index.js`, `App.tsx` | Native registration, background handlers, navigation and safe-area providers |
| `src/navigation/` | Onboarding routing, splash screen, typed route parameters |
| `src/screens/` | Screen composition and user interactions |
| `src/features/schedule/domain/` | Subject input types, time handling, conflict and unit rules |
| `src/features/schedule/data/` | Schedule reads, validation against stored records, batched writes |
| `src/features/schedule/services/` | Save/delete operations followed by reminder and widget refresh |
| `src/features/scanner/` | Pure registration-text parser and native OCR/orientation service |
| `src/features/finance/` | Budget periods, spending analysis, fee reserves, finance persistence, reusable cards |
| `src/core/database/` | WatermelonDB SQLite setup, schema, model relationships |
| `src/core/notifications/`, `src/core/widgets/` | Native integrations |
| `src/widgets/` | Android widget rendering and background tasks |
| `src/tokens/`, `src/shared/hooks/` | Design tokens and reusable UI behavior |

Read [the architecture and flow guide](docs/architecture.md) for the runtime walkthrough, persistence conventions, completed refactor, and remaining work.
