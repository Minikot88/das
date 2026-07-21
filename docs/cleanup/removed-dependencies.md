# Removed dependencies

| Dependency | Classification | Proof |
| --- | --- | --- |
| `framer-motion` | `CONFIRMED_UNUSED` | no source/config/runtime references; clean install graph and full gate after removal |
| `recharts` | `CONFIRMED_UNUSED` | no imports or chart registry references; current rendering uses Chart.js/ECharts; full gate after removal |

Removing these direct dependencies removed 41 transitive packages. Both full and production-only npm audits report zero known vulnerabilities.
