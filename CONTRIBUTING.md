# Contributing

## Development Principles

DashboardMiniBi v1.0 is in release candidate mode.

For release hardening:
- Do not add business features without approval.
- Do not change API contracts without approval.
- Do not change routing behavior without approval.
- Preserve local/mock mode behavior.
- Keep changes small and testable.

## Setup

```bash
npm ci
npm run dev
```

## Required Checks

Before submitting changes:

```bash
npm run lint
npm test
npm run build
npm audit
```

## Testing

Use Vitest and React Testing Library for:
- utilities
- store actions
- component behavior
- accessibility primitives
- critical user flows

Test files are colocated as:
- `*.test.js`
- `*.test.jsx`

Shared setup:
- `src/test/setup.js`

## Code Style

- Use existing React patterns.
- Prefer small functions and clear names.
- Keep UI behavior accessible.
- Use existing design tokens and CSS structure.
- Avoid broad refactors during release stabilization.

## State Changes

When changing store behavior:
- update or add tests in `src/store`
- verify localStorage snapshot compatibility
- document migration/recovery behavior when relevant

## UI Changes

When changing UI:
- preserve keyboard navigation
- preserve focus behavior
- check light and dark themes
- check mobile layout
- add or update tests for user-facing controls

## Documentation

Update relevant docs when changing:
- install commands
- environment variables
- state shape
- filters
- export behavior
- dataset behavior
- release process

## Pull Request Checklist

- Scope is clear.
- Lint passes.
- Tests pass.
- Build passes.
- No new audit vulnerabilities.
- Docs updated when behavior changes.
- No unrelated formatting churn.
