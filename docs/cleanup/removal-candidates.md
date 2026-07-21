# Removal candidates

| Candidate | Initial class | Evidence still required |
| --- | --- | --- |
| `framer-motion` | LIKELY_UNUSED | zero static/dynamic/config references; clean install/test/build after removal |
| `recharts` | LIKELY_UNUSED | zero static/dynamic/chart registration references; clean install/test/build after removal |
| 22 Knip file hits | UNKNOWN/MIXED | entrypoint, lazy route, CLI, decorator, worker, public export and build-path checks |
| Empty untracked directories | CONFIRMED_UNUSED | verify they contain no hidden runtime/config files |
| `outputs/data_dictionary_build/*` | RUNTIME/PROVENANCE_UNKNOWN | determine whether generated evidence is intentionally retained before any deletion |

No candidate is approved for deletion until its classification becomes `CONFIRMED_UNUSED`.
