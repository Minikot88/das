# State Management

## Ownership

The canonical workspace repository (`src/domain/workspace/workspaceRepository.js`) is the domain source of truth. It owns projects, datasets, charts, dashboards/widgets, shares, settings, and active context. Its `connectionProfiles` collection is reserved but intentionally unpopulated until a separately designed cutover exists.

Zustand (`src/store/useStore.js`) remains a compatibility projection for legacy screens and owns transient UI state such as panels, selections, filters, drafts, theme controls, and navigation context. Repository notifications refresh the projection in the same tab and valid browser storage events refresh it across tabs.

## Persistence

- Canonical domain key: `mini-bi-workspace-v1`.
- UI-only key: `mini-bi-ui-v1` and feature-owned draft/panel keys.
- Sanitized connection-profile compatibility key: `mini-bi-db-connections`; it is explicitly excluded from canonical migration.
- Legacy `mini-bi-v8-workspace`, `mini-bi-projects`, active keys, chart/layout keys, and unknown keys remain unchanged during migration.

Every canonical update clones the current snapshot, applies one mutation, normalizes/validates ownership, writes once, rereads and validates, then publishes. Failure retains the last valid snapshot and reports repository health.

`src/services/projectStorage.js`, `src/utils/storage.js`, and saved-chart utilities are compatibility facades. They delegate canonical domain changes and preserve their public signatures for older routes.

## Autosave And Recovery

- Zustand compatibility saves are debounced through `queueWorkspaceSave` and can be flushed.
- Dashboard Canvas has a focused autosave scheduler with pending/saving/saved/error states, latest-payload debounce, explicit flush, retry, cancel, and `beforeunload` warning.
- Uploaded image object URLs are session-only, excluded from durable payloads, labeled in the UI, and revoked on unmount.
- Invalid/future canonical JSON is preserved for manual recovery instead of overwritten.

## Security Boundary

Share snapshots are sanitized before canonical persistence. Connection metadata is sanitized before feature-key persistence, copy, preview, or export. Passwords, tokens, private keys, SSH passwords, client keys, certificates, credential URLs, and authorization values are not domain state.

## Testing

Repository, migration, selector, compatibility, store bridge, dataset/chart replay, autosave, share, and secret-safety tests run through `npm test -- --run`. Use `npm run check` for the full gate.
