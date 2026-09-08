<div align="center">
  <h1>Northstar Project Planner</h1>
</div>


<p align="center">
  English | <a href="README_CN.md">中文</a> <br>
  A private, cloud-backed project planner for turning milestones into clear, trackable work. <br>
  Feel free to try it via <a href="https://northstar-zhou.vercel.app" target="_blank">this link</a>
</p>


## 

![Northstar workspace preview](images/Preview.png)

The workspace connects three planning levels:

- **Project overview** shows overall progress, such as completed and remaining tasks.
- **Milestones** divide a project into meaningful checkpoints, each with a target date and calculated progress.
- **Task board** organizes concrete work across Planned, In progress, Review, and Done. Tasks can be filtered, edited, and moved between stages.

## Highlights

- Passwordless email OTP authentication with database-enforced user isolation
- Supabase PostgreSQL persistence across browsers and devices
- Project–milestone–task planning with automatic metrics and drag-and-drop
- Reliable loading, saving, offline recovery, and expired-session states

## Run locally

Requirements: Node.js 22 LTS and a Supabase project with the included migrations applied.

```bash
npm install
```

Create `.env.local` from `.env.example` and provide:

```ini
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

Start the development server:

```bash
npm run dev
```

## Build

Create a production build:

```bash
npm run build
```

Run the complete build and release-safety gate:

```bash
npm run check:release
```

The release check verifies the production build, public environment contract, legacy-storage removal, tracked environment files, and the absence of server-secret patterns in source and browser assets.

## Technical Overview

Northstar is a Vue 3 single-page application built with Vue Router, composables, and a repository-based data layer. Supabase provides passwordless OTP authentication, PostgreSQL persistence, generated data APIs, transactional database functions, and Row Level Security. Ownership rules are enforced inside the database rather than trusted to client-side filtering. Workspace initialization and reset operations use atomic RPC functions, while row-level CRUD prevents full-state overwrites. The interface models loading, saving, network failure, empty-data, and expired-session states explicitly. Vite produces the static client bundle for Vercel, keeping the application serverless and operationally lightweight while preserving a clean path for future AI features through protected server-side functions.

## Documentation

| Document | Purpose |
|---|---|
| [Architecture and delivery](docs/phase-1-architecture-and-delivery.md) | Architecture, route semantics, scope, and delivery gates |
| [Database schema](docs/database-schema.md) | Tables, constraints, indexes, migrations, and schema tests |
| [User isolation](docs/user-isolation.md) | RLS policies and two-user security verification |
| [Email OTP authentication](docs/email-otp-auth.md) | Supabase Auth configuration and authentication tests |
| [Cloud planner data](docs/cloud-planner-data.md) | Repository mapping, lifecycle RPCs, and persistence tests |
| [Resilient UI states](docs/resilient-ui-states.md) | Loading, saving, failure recovery, and session-expiry tests |
| [Release readiness](docs/release-readiness.md) | Build, dependency, secret, browser, and deployment checks |


## Deployment

The frontend is designed for Vercel, while authentication and application data remain on Supabase. SPA routing requires all application paths to fall back to `index.html`.

Before production deployment:

1. Apply all Supabase migrations.
2. Configure the two public environment variables in Vercel.
3. Set the Supabase Site URL and allowed redirect URLs.

## Current Scope

Northstar currently supports one default workspace per user. The data model permits future multi-project support, but the current interface does not expose project switching.

AI planning assistance, including a possible DeepSeek integration, belongs to a future iteration and should be implemented through a protected serverless function.

## License

Licensed under the [MIT License](LICENSE).