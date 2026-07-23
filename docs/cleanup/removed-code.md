# Removed code

No live function, branch, route, API handler, chart registration, worker or compatibility adapter was removed.

The removed code consists only of five whole-file UI/hook implementations with no runtime reachability. Unused named exports reported inside live modules remain in place because public API, tests and dynamic consumers cannot be disproved with sufficient confidence in this pass.
