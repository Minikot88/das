# Release Checklist

## Release Candidate

Product:
- [ ] Confirm release version: v1.0.
- [ ] Confirm no new feature work is included.
- [ ] Confirm no UI redesign work is included.
- [ ] Confirm no business logic changes are included beyond approved hardening work.

Documentation:
- [ ] `README.md` updated.
- [ ] `USER_GUIDE.md` complete.
- [ ] `ADMIN_GUIDE.md` complete.
- [ ] `DATASET_GUIDE.md` complete.
- [ ] `DASHBOARD_GUIDE.md` complete.
- [ ] `RELEASE_NOTES_v1.0.md` complete.
- [ ] `INSTALLATION.md` complete.
- [ ] `CONTRIBUTING.md` complete.
- [ ] Architecture docs complete.
- [ ] Cleanup report complete.

Architecture:
- [ ] `ARCHITECTURE.md` complete.
- [ ] `COMPONENT_ARCHITECTURE.md` complete.
- [ ] `STATE_MANAGEMENT.md` complete.
- [ ] `FILTER_ENGINE.md` complete.
- [ ] `EXPORT_SYSTEM.md` complete.

Quality:
- [ ] `npm ci` succeeds from a clean checkout.
- [ ] `npm run lint` passes.
- [ ] `npm test` passes.
- [ ] `npm run build` passes.
- [ ] `npm audit` reports zero vulnerabilities.

Manual Smoke Tests:
- [ ] Login in mock mode.
- [ ] Home renders projects and quick actions.
- [ ] Dashboard renders active project/sheet/dashboard.
- [ ] Create dashboard.
- [ ] Open Builder.
- [ ] Create and save chart.
- [ ] Chart appears on dashboard.
- [ ] Global filters apply and clear.
- [ ] Cross-filtering applies and clears.
- [ ] Drilldown breadcrumb works.
- [ ] Saved view create/load/rename/delete works.
- [ ] CSV import preview and import works.
- [ ] Dataset table search/sort/pagination works.
- [ ] Settings persist theme and density.
- [ ] PNG export works.
- [ ] JPG export works.
- [ ] PDF export works.
- [ ] Share link opens read-only view.
- [ ] Embed route opens read-only view.
- [ ] Presentation mode opens and exits with Escape.

Accessibility:
- [ ] Keyboard navigation works across routes.
- [ ] Command palette traps focus and closes with Escape.
- [ ] Dataset explorer traps focus and closes with Escape.
- [ ] Share modal traps focus and closes with Escape.
- [ ] Create project modal traps focus and closes with Escape.
- [ ] Visible focus states are present.
- [ ] Chart cards expose screen-reader summaries.
- [ ] Tables expose sort state.

Performance:
- [ ] Dashboard with representative widget count remains responsive.
- [ ] CSV import uses worker path in supported browsers.
- [ ] Enterprise table remains responsive with representative row count.
- [ ] Export handles representative dashboard size.

Reliability:
- [ ] Corrupted localStorage falls back safely.
- [ ] Storage failure warning appears when localStorage write fails.
- [ ] Dashboard load failure does not crash route.
- [ ] Route error boundary renders recovery screen on render error.
- [ ] Missing share token shows unavailable state.
- [ ] Broken/malformed imported dataset metadata recovers or warns.

Release Hygiene:
- [ ] Local log files are excluded from release commit/package.
- [ ] `dist/` inclusion matches release process.
- [ ] `.env` is not committed.
- [ ] `.env.example` is current.
- [ ] No secrets in source.
- [ ] No unintended debug output.
- [ ] No `TODO` or `FIXME` markers in release code.

Packaging:
- [ ] Create release branch or tag.
- [ ] Attach release notes.
- [ ] Attach build artifacts if required.
- [ ] Record final commit SHA.
- [ ] Record final verification command outputs.

Post-Release:
- [ ] Monitor reported storage/export/browser issues.
- [ ] Track documentation feedback.
- [ ] Triage deferred cleanup candidates.
- [ ] Plan E2E/browser test expansion.
