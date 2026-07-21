# Getting Started

## Requirements

- Node.js `^20.19.0` or `>=22.12.0`
- npm

## Local development

```bash
npm ci
npm run dev
```

The default configuration uses local/mock mode. Mock login is `demo@dataviz.bi` / `demo1234`; existing permissive mock authentication behavior is unchanged.

## Before submitting changes

```bash
npm run lint
npm run typecheck
npm test -- --run
npm run build
npm audit --omit=dev
```

Run `npm run check` for the aggregate gate. Do not change routes, storage schemas, or API contracts as part of a file-organization change. Add module code to its owner and expose only the public surface needed by other modules.
