# Northstar Project Planner

A responsive Vue 3 project-planning interface with passwordless email authentication, per-user Supabase persistence, milestone tracking, a drag-and-drop task board, filters, automatic progress, and overdue cues.

Architecture, route semantics, security requirements, and delivery gates are documented in [`docs/phase-1-architecture-and-delivery.md`](docs/phase-1-architecture-and-delivery.md).

The Supabase relational schema, deployment procedure, and expected verification results are documented in [`docs/database-schema.md`](docs/database-schema.md).

Per-user RLS policies and executable isolation tests are documented in [`docs/user-isolation.md`](docs/user-isolation.md).

Email OTP setup, route behavior, and end-to-end acceptance tests are documented in [`docs/email-otp-auth.md`](docs/email-otp-auth.md).

Cloud data mapping, workspace lifecycle RPCs, and persistence acceptance tests are documented in [`docs/cloud-planner-data.md`](docs/cloud-planner-data.md).

Loading, saving, failure recovery, empty-workspace, and expired-session acceptance tests are documented in [`docs/resilient-ui-states.md`](docs/resilient-ui-states.md).

## Run locally

```bash
npm install
npm run dev
```

Then open the local URL shown by Vite.

## Build

```bash
npm run build
```

Run the production build and repository/browser-secret release gate together:

```bash
npm run check:release
```

Release safety checks and expected browser verification results are documented in [`docs/release-readiness.md`](docs/release-readiness.md).

Project data is stored in Supabase and isolated by the authenticated user. Local browser storage is used only by the Supabase client to persist the login session.
