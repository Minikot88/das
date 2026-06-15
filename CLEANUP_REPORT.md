# Cleanup Report

## Scope

This report scans the release candidate workspace for:
- TODO
- FIXME
- dead code candidates
- unused imports
- unused CSS candidates
- debug code

No application code was modified as part of this cleanup audit.

## Commands Used

```bash
rg -n "TODO|FIXME|console\.|debugger|eslint-disable|@ts-ignore|placeholder|coming soon|Preview|mock|unused" src docs README.md TESTING_NOTES.md package.json
```

Existing quality gates from the hardening sprint:

```bash
npm run lint
npm test
npm run build
npm audit
```

Last known state:
- lint passed
- tests passed
- build passed
- audit reported zero vulnerabilities

## Critical Findings

None found.

No `TODO`, `FIXME`, `debugger`, `@ts-ignore`, or `eslint-disable` markers were found in `src`.

## High Findings

### 1. Release Candidate Still Contains Intentional Mock/Local Mode References

Locations:
- `README.md`
- `TESTING_NOTES.md`
- `src/api/chartApi.js`
- `src/api/authApi.js`
- `src/api/dashboardApi.js`
- `src/api/projectApi.js`
- `src/data/mockData.js`
- `src/data/mockSchema.js`
- `src/utils/mockSqlEngine.js`

Status: expected for v1.0 local release.

Impact:
- Not dead code.
- Must remain clearly documented as local/mock mode.

Recommendation:
- Keep these references.
- Do not remove until a server-backed production mode is explicitly scoped.

### 2. Disabled Navigation Placeholders Remain

Locations:
- `src/layout/SidebarLeft.jsx`
- related CSS in `src/styles/layout.css` and `src/styles/enterprisePolish.css`

Examples:
- Templates
- Favorites
- Recent

Status: intentional placeholder navigation.

Impact:
- Product clarity risk, not a code correctness issue.

Recommendation:
- For v1.0, keep if roadmap visibility is desired.
- For a stricter production release, either remove disabled items or move them to documentation/roadmap.

## Medium Findings

### 1. Console Error In Store

Location:
- `src/store/useStore.js`

Observed:
- `console.error("Missing active context")`

Status:
- Debug-like output, but used as a defensive guard.

Impact:
- Low runtime impact.
- Could create console noise if an invalid chart save path is triggered.

Recommendation:
- Replace with storage/app notice only if user-facing recovery is needed.
- Safe to leave for v1.0.

### 2. Preview And Placeholder Naming In CSS

Locations:
- `src/styles/builder.css`
- `src/styles/workspacePolish.css`
- `src/styles/dashboard.css`

Examples:
- `.chart-echarts-placeholder`
- `.dashboard-canvas-grid .react-grid-placeholder`
- builder preview classes

Status:
- Mostly legitimate UI states or library placeholder styling.

Impact:
- Not confirmed dead CSS.

Recommendation:
- Do not remove without CSS coverage tooling or visual regression tests.

### 3. Historical Docs Contain Stale Earlier-Phase Findings

Locations:
- `docs/FUNCTIONAL_AUDIT.md`
- `docs/FUNCTIONAL_ROADMAP.md`
- `docs/SCREEN_MAP.md`
- `docs/ROUTE_MAP.md`

Status:
- Historical reports from earlier phases.

Impact:
- Some entries mention missing Datasets/Settings routes that were later implemented.

Recommendation:
- Keep as historical reports.
- Use root release docs and latest sprint reports as current release truth.

## Low Findings

### 1. Build/Dev Log Files Present

Locations:
- `codex-home-vite.log`
- `codex-home-vite.err.log`
- `codex-vite.log`
- `codex-vite.err.log`
- `tmp-phase*.log`
- `tmp-phase*.err.log`

Status:
- Local development artifacts.

Impact:
- Review noise if committed.

Recommendation:
- Ensure log files are ignored or removed before release commit packaging.

### 2. Generated `dist/` Directory Present

Location:
- `dist/`

Status:
- Build output.

Impact:
- Should not be committed unless the release process intentionally includes built assets.

Recommendation:
- Confirm `.gitignore` excludes `dist/`.
- Release from CI/build artifact pipeline where possible.

### 3. Large Historical Documentation Set

Location:
- `docs/`

Status:
- Expected from design, audit, sprint, and screenshot phases.

Impact:
- Useful context, but can overwhelm release readers.

Recommendation:
- Treat root docs as release-facing.
- Treat `docs/` as project history and audit evidence.

## Unused Imports

No unused imports were detected by the current ESLint configuration during the last hardening verification.

## Dead Code

No confirmed dead code was removed or identified. Candidates such as disabled navigation, preview UI, and placeholder CSS are intentional UI states or historical release markers.

## Unused CSS

No automated unused CSS tool is configured. Because the app relies on global CSS, route-level lazy loading, third-party generated class names, and historical style layers, CSS should not be removed without visual regression coverage.

Recommended future cleanup:
- Add CSS usage tooling or visual regression screenshots.
- Remove obsolete historical style passes only after route-by-route verification.
- Keep third-party class selectors for React Grid Layout and Chart.js surfaces.

## Release Recommendation

Proceed with release candidate packaging after confirming:
- log files are not included in the release commit
- `dist/` is handled by the intended release process
- root release docs are treated as current documentation
- historical docs remain available for traceability
