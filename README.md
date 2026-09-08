# Northstar Project Planner

A responsive Vue 3 project-planning interface with milestone tracking, a drag-and-drop task board, filters, automatic progress, overdue cues, and browser-local persistence. Supabase authentication and per-user cloud persistence are planned for the next Phase 1 increment.

Architecture, route semantics, security requirements, and delivery gates are documented in [`docs/phase-1-architecture-and-delivery.md`](docs/phase-1-architecture-and-delivery.md).

The Supabase relational schema, deployment procedure, and expected verification results are documented in [`docs/database-schema.md`](docs/database-schema.md).

Per-user RLS policies and executable isolation tests are documented in [`docs/user-isolation.md`](docs/user-isolation.md).

Email OTP setup, route behavior, and end-to-end acceptance tests are documented in [`docs/email-otp-auth.md`](docs/email-otp-auth.md).

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

Project data is saved in the current browser using `localStorage`. Clearing browser storage resets the workspace.
