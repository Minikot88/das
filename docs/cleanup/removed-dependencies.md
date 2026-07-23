# Removed dependencies

| Dependency | Classification | Proof | Replacement | Commit |
| --- | --- | --- | --- | --- |
| `framer-motion` | `CONFIRMED_UNUSED` | no source/config/runtime references; clean install graph and full gate after removal | none required | `67482b2` |
| `recharts` | `CONFIRMED_UNUSED` | no imports or chart registry references; current rendering uses Chart.js/ECharts; full gate after removal | existing Chart.js/ECharts renderers | `67482b2` |

Removing these direct dependencies removed 41 transitive packages. Both full and production-only npm audits report zero known vulnerabilities.
