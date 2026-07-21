# Removal candidates

| Candidate | Initial class | Evidence still required |
| --- | --- | --- |
| `framer-motion` | CONFIRMED_UNUSED / REMOVED | zero static/dynamic/config references; 54-file baseline and post-removal gates passed |
| `recharts` | CONFIRMED_UNUSED / REMOVED | zero static/dynamic/chart registration references; 54-file baseline and post-removal gates passed |
| Five legacy UI/hook files | CONFIRMED_UNUSED / REMOVED | zero incoming imports, route registrations and build entries; full post-removal gate passed |
| Remaining Knip file hits | RETAINED or UNKNOWN | entrypoint, config, seed, generated evidence, CLI and documented public barrels |
| Empty untracked directories | PARTIALLY_REMOVED | two nested empty chart directories removed; `.agents` retained because workspace policy denied deletion |
| `outputs/data_dictionary_build/*` | RUNTIME/PROVENANCE_UNKNOWN | determine whether generated evidence is intentionally retained before any deletion |

No remaining candidate is approved for deletion until its classification becomes `CONFIRMED_UNUSED`.
