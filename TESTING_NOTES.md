# Testing Notes

This project does not currently include an automated test runner. Use these manual checks before adding new features or cutting a release.

Mock auth and mock share links are client-only demo behavior. Passing these checks does not mean the app is production-secure; production still needs server-side auth, authorization, and durable share records.

## Auth Guard

1. Clear localStorage or open a private browser window.
2. Visit `/dashboard`.
3. Confirm the app redirects to `/login`.
4. Visit `/builder`.
5. Confirm the app redirects to `/login`.
6. Use the browser back button and confirm private pages are still blocked while unauthenticated.

## Mock Login

1. Keep `VITE_USE_MOCK=true`.
2. Open `/login`.
3. Use `demo@dataviz.bi` and `demo1234`, or any non-empty email/password.
4. Submit the form.
5. Confirm loading clears and the app opens `/dashboard` or the originally requested private route.
6. Refresh the page and confirm the authenticated mock session persists in localStorage.

## Failed Login And Register

1. In non-mock mode, point `VITE_API_BASE_URL` to an endpoint that returns an error, or temporarily make the mock auth action throw in a local branch.
2. Submit `/login`.
3. Confirm an error message appears and the sign-in button is enabled again.
4. Submit `/register`.
5. Confirm an error message appears and the create-account button is enabled again.
6. Confirm the app does not navigate to private routes after failure.

## Project Creation Failure

1. Temporarily force `createProjectApi` or the store create action to throw in a local branch.
2. Open the create project modal.
3. Submit a valid project name.
4. Confirm the modal stays open.
5. Confirm a user-friendly error appears.
6. Confirm the cancel button and input return to a usable state.

## Dashboard Loading

1. Sign in in mock mode.
2. Create or open a project.
3. Open `/dashboard`.
4. Confirm sheets, dashboards, saved charts, empty canvas, and inspector render without console errors.
5. Add a chart from the builder.
6. Confirm the new widget is selected and remains after refresh.

## Chart Delete Cleanup

1. Create a chart and place it on a dashboard.
2. Delete the saved chart through the chart API/action path.
3. Confirm the chart record is removed.
4. Confirm all dashboard layout entries referencing that chart are removed.
5. Refresh the page.
6. Confirm the widget does not reappear and no empty/orphan widget renders.

## Public Dashboard Share Token

1. Sign in and open a dashboard with at least one widget.
2. Open the share modal and copy the public URL.
3. Confirm the URL includes a `share=` token.
4. Open the URL and confirm it renders a read-only dashboard view.
5. Remove or alter the `share` token.
6. Confirm the public page shows the not-found/unavailable state instead of dashboard data.

## Embed Route

1. Open the share modal and copy the embed URL or iframe code.
2. Confirm the URL uses `/dashboard/:dashboardId/embed`.
3. Open the embed URL.
4. Confirm it renders without the standard public header by default.
5. Add `header=1` to the query string.
6. Confirm the header appears.

## Thai Text

1. Open the share modal.
2. Open a public dashboard view.
3. Open an embed dashboard view.
4. Confirm Thai labels are readable UTF-8 text and do not show mojibake such as `à¸`, `à¹`, or `Ã`.

## Build And Security

Run:

```bash
npm run lint
npm run build
npm audit
docker compose config
```

Expected results:

1. Lint passes with no errors.
2. Build passes.
3. Audit reports zero vulnerabilities.
4. Docker Compose config renders a single frontend service. If Docker is unavailable locally, validate this command in CI or on a machine with Docker installed.
