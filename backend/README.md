# Telecom ITSM Backend

Express + PostgreSQL backend for Team 15 ITSM project.

## Setup

1. Copy `.env.example` to `.env` and fill values.
2. Install dependencies:
   - `npm install`
3. Run dev server:
   - `npm run dev`
   - Windows PowerShell (ExecutionPolicy restriction): `npm.cmd run dev`
4. Health check:
   - `GET /api/health`

## Authentication

- `POST /api/auth/login` returns JWT token and user payload.
- `GET /api/auth/me` validates token and returns current user.
- Protected routes require header: `Authorization: Bearer <token>`.
- Role-based authorization is enabled on release/problem routes.
- For seed placeholder users, login password is `demo123` unless overridden with `DEMO_PASSWORD`.

## Main API

### Release Module
- `GET /api/release/pipeline`
- `GET /api/release/rfc`
- `GET /api/release/rfc/:id`
- `POST /api/release/rfc`
- `PUT /api/release/rfc/:id/cab`
- `PUT /api/release/:id/go-no-go`
- `PUT /api/release/:id/deploy`
- `PUT /api/release/:id/pir`
- `PUT /api/release/:id/rollback`

### Problem Module
- `GET /api/problem`
- `GET /api/problem/active`
- `GET /api/problem/trend`
- `GET /api/problem/:id`
- `POST /api/problem`
- `PUT /api/problem/:id/rca`
- `PUT /api/problem/:id/status`
- `PUT /api/problem/:id/incidents`
- `GET /api/problem/kedb`
- `GET /api/problem/kedb/:id`
- `PUT /api/problem/kedb/:id`

### Shared Module
- `GET /api/shared/users`
- `GET /api/shared/services`
- `GET /api/shared/incidents`

## Notes

- This backend expects PostgreSQL schema from the project SQL scripts.
- `POST /api/release/rfc` can optionally create a matching `releases` row when `kreiraj_release=true` and release metadata is provided.
- Column names with local characters are handled through quoted SQL identifiers.
- Keep RLS and policies configured in Supabase before exposing direct client access.
