# Baseline Results

Date: 2026-07-21  
Commit: `e6f6be1`  
Branch created before edits: `refactor/production-folder-structure`

## Environment

- Node/npm dependencies were already installed.
- PowerShell blocks `npm.ps1`; baseline commands use `npm.cmd` with identical npm semantics.
- Docker CLI 29.6.1 and Docker Compose 5.3.0 are installed.
- Docker Desktop Linux daemon is not running, so image build/runtime smoke testing is unavailable at baseline.

## Commands

| Command | Result | Evidence |
| --- | --- | --- |
| `npm.cmd run lint` | PASS | ESLint exit 0, no warnings printed |
| `npm.cmd run typecheck` | PASS | `tsc --noEmit` exit 0 |
| `npm.cmd run test -- --run` | PASS | 44 files, 247 tests passed |
| `npm.cmd run build` | PASS with warning | 1,870 modules transformed; Vite exit 0 |
| `npm.cmd run audit:prod` | PASS | 0 production vulnerabilities |
| `npm.cmd run check` | BASELINE FAIL | lint, typecheck, tests, and build passed; stopped at `npm audit` |
| `docker version` | ENVIRONMENT BLOCKED | client present; daemon pipe unavailable |

## Known baseline warnings and failures

1. Vitest/jsdom prints `HTMLCanvasElement.getContext()` not implemented without the optional canvas package. Tests still pass.
2. Vite warns about chunks over 500 kB after minification:
   - `ChartPreview`: 870.12 kB (289.23 kB gzip)
   - application `index`: 501.47 kB (130.18 kB gzip)
3. Full `npm run check` fails at the development dependency audit because `brace-expansion <1.1.16` has one high-severity advisory. Production audit reports 0 vulnerabilities.
4. Docker build and runtime smoke tests cannot run until the Docker daemon is available.

These are baseline conditions. This organization refactor will not silently change dependencies, chunking behavior, tests, or Docker architecture to hide them.

