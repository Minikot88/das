# Testing Notes

## Automated Gate

Run:

```bash
npm ci
npm ls --depth=0
npm run lint
npm run typecheck
npm test -- --run
npm run build
npm run check
npm audit
npm audit --omit=dev
docker compose config --quiet
git diff --cached --check
git diff --check
git status --short --branch
```

`check` includes ESLint for JS/JSX/TS/TSX, strict TypeScript, Vitest/Testing Library/axe-core tests, the production build, the full dependency audit, and the production-only audit. jsdom may report that canvas `getContext` is not implemented; chart behavior still requires browser verification. The build currently reports the ChartPreview chunk-size warning as a documented residual risk.

## Browser Matrix

Verify at 390, 768, 1024, 1280, and 1440+ px:

1. Mock login/register, error state, route guard, refresh, back/forward.
2. Home project creation/selection and active-context parity after refresh.
3. CSV import with quoted multiline data, duplicate headers, limits, preview, and cancellation.
4. Designer dataset selection, mapping, preview, save, edit, and exact replay.
5. Dashboard add/move/resize, undo/redo, autosave status, refresh, failure/retry, and delete confirmation.
6. Local share view/embed with valid, altered, missing, and expired tokens; verify read-only controls and same-browser copy.
7. Connection create/edit/test/duplicate/copy/export/delete using synthetic sentinel secrets; scan storage and generated JSON.
8. Settings, current routes, legacy routes, empty/unavailable states, dark theme, keyboard focus, Escape, focus restoration, and reduced motion.
9. Console errors, horizontal overflow, readable Thai text, contrast, and touch targets.

## Data Preservation

Migration tests compare legacy source bytes before and after cutover. Manual verification should also export or record relevant keys, trigger first canonical read, and confirm every legacy source value remains identical. Invalid and future-version canonical documents must remain untouched.

## Security Boundary

Mock auth is not secure authentication. Local links are not public authorization. Passing frontend checks does not replace server-side sessions, authorization, durable shares/assets, query enforcement, or a secret vault.
