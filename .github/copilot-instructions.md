# Copilot Instructions

## Build and run commands

- `npm install` installs dependencies. `install.bat` is the Windows helper for the same step.
- `npm run migrate:hosted-db` runs the one-time/idempotent hosted Postgres schema migration.
- `npm start` starts the Create React App frontend dev server.
- `start-web.bat` starts integrated local Vercel runtime (`vercel dev`) so frontend and API share the same origin.
- `npm run build` creates the production frontend bundle.
- `npm test` runs frontend tests with `react-scripts test`.
- Single test file: `npm test -- --watch=false src/dateUtils.test.js`.
- There is currently no dedicated lint script in `package.json`.

## High-level architecture

- The deployed architecture is Vercel-native: frontend static assets plus serverless backend routes under `api/*.js`, backed by hosted Postgres (`POSTGRES_URL`/`DATABASE_URL`).
- Backend logic is modularized under `api/_lib/` (scoring, egg rules, time utilities, DB helpers, and handlers) and reused by each API route function.
- `src/App.js` is the main stateful orchestrator. It loads the initial payload, owns tabs/modals/confetti and all mutation handlers, and passes already-shaped props into mostly presentational components under `src/components/`.
- `src/api.js` is the only frontend-backend boundary and uses same-origin `/api` by default (or `REACT_APP_API_BASE` when provided).
- API surface is implemented by route functions (`api/load.js`, `api/stats.js`, `api/save-checkin.js`, etc.). `/api/load` returns a denormalized payload with summary state, bounded recent history, total counts, current-month calendar days, current-day total points, and today’s egg info (latest event plus same-day totals); `/api/stats` returns chart-focused aggregates (task, daily, weekly, monthly) for both counts and points, including egg-point trends.
- `src/mockData.js` is the source of truth for static product content: check-in tasks, levels, rewards, medals, and rule text all live there and are consumed by `App.js` plus the tab components.
- Persistence uses hosted Postgres for durable history and singleton records (`records`, `exchanges`, `cardPurchases`, `medals`, `protectCards`, `wish`, `userState`, `dailyTaskState`) plus egg logs (`eggEventsLog`, with `eggEvents` retained for legacy migration), while `localStorage` tracks day-scoped frontend state such as today's task completion and today's earned points.

## Key conventions

- Keep user-facing copy in Chinese. Titles, reward names, rules, and even helper scripts already assume a Chinese-language UI.
- When adding or changing features, update the full chain together: `src/mockData.js` for static definitions, `src/App.js` for client-side orchestration, `src/api.js` for the request wrapper, and relevant API route + `api/_lib/*` shared modules when persistence/API behavior changes.
- The frontend state shape does not exactly mirror the backend payload. For example, the backend returns `level`, while `App.js` stores that value as `currentLevel`. If response fields change, update both sides together.
- The app uses optimistic client updates: handlers in `App.js` update React state immediately and then fire API calls without awaiting them. Follow that pattern unless you are deliberately reworking error handling across the app.
- Daily reset behavior depends on **local-time** ISO date keys in `localStorage` (`lastPointsDateISO`, `todayTotalPoints`, `lastCheckinISO`, `lastCheckinDate`, `lastCheckinPageDateISO`, `todayCheckinItems`, `awardedItemDate`, `awardedItemIds`). Changes to streaks, daily totals, or calendar logic usually need coordinated updates across those keys.
- Backend persistence separates event history from current totals. Check-ins append into `records`, exchanges append into `exchanges`, and current balances/streak/level are synchronized in the singleton `userState` row (`id = 1`). `userState.totalPoints` is spendable balance, while `userState.levelPoints` is non-decreasing growth points used for level calculation.
- Egg awarding is server-authoritative in `/api/save-checkin` (time + completion based); frontend should treat egg points/count from response as truth and only do optimistic base-task scoring before reconciliation.
- Event timestamps in `records.date` and `exchanges.date` are stored as local datetime strings in `YYYY-MM-DD HH:mm:ss` format.
- Current-day task completion status is synchronized across devices through `dailyTaskState` and loaded via `todayTaskStates` in `/api/load`.
- Hosted DB schema migration should be run via `npm run migrate:hosted-db` before first production traffic.
