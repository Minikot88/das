# Installation

## Prerequisites

- Node.js 20 or newer.
- npm.
- Git.
- Docker optional.

## Clone And Install

```bash
git clone <repository-url>
cd dashboard-mini-bi
npm ci
```

## Environment Setup

Copy the example env file when using Docker or custom environment values:

```bash
cp .env.example .env
```

Common defaults:

```env
VITE_USE_MOCK=true
VITE_API_BASE_URL=
VITE_API_PROXY_TARGET=http://localhost:3000
VITE_API_TIMEOUT_MS=15000
```

## Run Development Server

```bash
npm run dev
```

Open the local URL printed by Vite.

## Run Tests

```bash
npm test
```

Watch mode:

```bash
npm run test:watch
```

## Lint

```bash
npm run lint
```

## Build

```bash
npm run build
```

Build output is written to `dist/`.

## Preview Production Build

```bash
npm run preview
```

## Docker

```bash
cp .env.example .env
docker compose up --build
```

Default host port is `8080`.

## Clean Local Browser State

If local data is corrupted or you need a clean workspace:

1. Open browser devtools.
2. Open Application/Storage.
3. Clear localStorage for the app origin.
4. Refresh the app.

Workspace storage key:
- `mini-bi-v8-workspace`

Builder draft key:
- `mini-bi-v8-builder-draft`
