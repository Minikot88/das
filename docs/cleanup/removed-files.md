# Removed files

The following tracked files were classified `CONFIRMED_UNUSED` only after zero incoming-import searches, route/entrypoint inspection, Knip discovery and a successful production build:

| Removed file | Evidence | Behavior covered by | Commit |
| --- | --- | --- | --- |
| `src/app/layouts/SidebarLeft.jsx` | no source importer; authenticated shell uses `Layout.jsx`/current navigation | route/layout tests + production build | `76a0b68` |
| `src/shared/components/ui/Badge.jsx` | no source importer or public export | full component tests + production build | `76a0b68` |
| `src/modules/dashboards/designer-v2/components/Header.tsx` | no route, component or lazy importer | designer tests + production build | `76a0b68` |
| `src/modules/dashboards/designer-v2/components/Toolbar.tsx` | no importer; not the distinct shared `Layout.jsx` toolbar | designer tests + production build | `76a0b68` |
| `src/modules/dashboards/designer-v2/hooks/useResizablePanel.ts` | no hook consumer or public export | full typecheck/tests/build | `76a0b68` |

Two untracked, empty nested chart directories were also removed. The empty `.agents` directory was not removed because its workspace policy denies mutation.

Post-removal evidence: lint, TypeScript, 56 test files / 291 tests and the Vite production build passed.
