# FamilyWellnessApp / NutriBot Familiar

Expo SDK 57 + React Native 0.86 + Expo Router mobile app. All user-facing copy is Spanish (Mexico); keep new strings in Spanish and match the existing tone. `README.md` is the Spanish product overview.

## Expo has changed — do not trust your training data

Before writing code that touches an Expo, EAS, or React Native API:

1. Read the `expo` major version in `package.json` (currently 57).
2. Fetch the matching docs: `https://docs.expo.dev/versions/v57.0.0/`
3. For anything else, start at https://docs.expo.dev/llms.txt (index + common LLM corrections) and follow the specific page. Never answer from memory.

## Commands

npm is the package manager (`package-lock.json`; no `bun.lock`/`yarn.lock`).

```bash
npm install                 # install deps
npm start                   # expo start (also regenerates .expo/types)
npm run android|ios|web     # start on a platform
npm run lint                # expo lint; slow on first run (minutes) — use a generous timeout
npx tsc --noEmit            # typecheck (strict mode)
npx expo install <pkg>      # ALWAYS use instead of npm install for Expo/RN deps
npx expo-doctor             # dependency/config diagnostics
npm run build:android:apk   # EAS preview build -> internal APK
```

There is **no test script, test framework, or CI**. Do not invent tests or claim they ran; verify with `npm run lint` + `npx tsc --noEmit`. Lint baseline is 0 errors and 3 known warnings (array-type in `familiar.tsx`, unused vars in `use-color-scheme.web.ts`) — don't chase them unless the task touches those files.

## Architecture

- `src/app/index.tsx` (~1.9k lines) is the **entire** NutriBot Familiar app: login/register, tutor panel, child panel, avatar builder, chat, and all styles. Subcomponents and theme/styles live in the same file; there is no component library, global store, or API layer.
- `src/app/familiar.tsx` (~1.1k lines) is the legacy "Warrior Kids" app served at `/familiar`. It is independent of `index.tsx` — different data model, styles, and storage.
- `src/app/_layout.tsx` is a headerless `Stack` with `ThemeProvider`; the only routes are `/` and `/familiar`. No tabs are mounted.
- `src/components/app-tabs*.tsx` are unused template leftovers and reference a non-existent `explore` route. Don't wire them up without creating those routes.
- Path aliases: `@/*` → `src/*`, `@/assets/*` → `assets/*`.
- No NativeWind/Tailwind — styling is `StyleSheet.create` factories keyed by a theme object (`crearEstilos(T)` in `index.tsx`, memoized through `TemaContext`/`useEstilos`). `src/global.css` only defines web font variables and is imported from `src/constants/theme.ts`.
- Platform forks use `.web.tsx` files (`animated-icon`, `app-tabs`, `use-color-scheme`); mirror that pattern for web-specific behavior.

## Local persistence (easy to break)

- Two independent, versioned AsyncStorage keys: `nutribot-familiar-local-v1` (`index.tsx`) and `warrior-kids-local-v1` (`familiar.tsx`). Don't merge or migrate them casually.
- Parsed JSON is validated by hand-written type guards (`isStoredAppData`, `isAppData`). Any new persisted field must be added to its guard, or existing installs will hit the "No se pudieron cargar los datos locales" alert.
- `index.tsx` only starts writing after `datosCargados` and serializes writes through the `escrituras` promise ref. Preserve that gate/ordering so the initial load isn't overwritten.
- Sessions are intentionally not persisted: closing the app logs the user out. Chat responses are local/predefined — there is no external AI/API.

## Config & native

- `ios/` and `android/` are gitignored and generated (CNG). Configure native behavior in `app.json` and config plugins; never create or edit them by hand.
- `experiments.typedRoutes` and `experiments.reactCompiler` are enabled. New routes must exist before route strings typecheck; `npm start` regenerates `.expo/types`.
- `SplashScreen.preventAutoHideAsync()` runs in `_layout.tsx` and `AnimatedSplashOverlay` hides it. Don't add a second hide call.
- `react-native-reanimated.d.ts` is an intentional untyped module stub — don't delete it.
- `eas.json` has only the `preview` profile (internal-distribution APK); there is no production profile. Run EAS as `npx eas-cli@latest <command>`.
- Expo Go only bundles its own native modules. After adding a native library, use a dev build: `npx expo run:ios|android` or `eas build --profile development`.
- Prefer official Expo modules over third-party libraries; check available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
