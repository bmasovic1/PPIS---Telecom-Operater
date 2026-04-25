# Telecom ITSM Frontend

React + Vite frontend for Team 15 ITSM project.

## Setup

1. Copy `.env.example` to `.env`.
2. Set backend URL:
   - `VITE_API_BASE_URL=http://localhost:4000/api`
3. Install packages:
   - `npm install`
4. Start dev server:
   - `npm run dev`
   - Windows PowerShell (ExecutionPolicy restriction): `npm.cmd run dev`

## Modules

- Module 1: Release and Deployment Management
  - RFC creation
  - CAB decision updates
  - Go/No-Go, deployment and PIR updates
  - Release pipeline table

- Module 2: Problem Management
  - Problem ticket creation with multiple incidents
  - RCA and status updates
  - Active problems table
  - 30-day trend table
  - KEDB view

## API dependency

Frontend expects backend endpoints under `/api` namespace.

## Authentication flow

- Login screen calls `POST /api/auth/login`.
- JWT token is stored in localStorage and attached as Bearer token for API calls.
- Session bootstrap calls `GET /api/auth/me` to restore logged user.
- UI module tabs are shown based on role:
   - Release module roles: `admin`, `release_manager`, `change_manager`, `devops`, `cab_clan`, `qa_inzenjer`
   - Problem module roles: `admin`, `problem_manager`, `noc_operater`, `it_inzenjer`
