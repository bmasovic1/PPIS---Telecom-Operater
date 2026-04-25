# Run On Windows (PowerShell Safe)

If `npm` fails with `npm.ps1 cannot be loaded`, use `npm.cmd` commands below.

## Option A: One command for both apps

From workspace root:

`npm.cmd run dev:win`

or double-click:

`start-all.cmd`

## Option B: Separate terminals

Backend:

`npm.cmd --prefix backend run dev`

Frontend:

`npm.cmd --prefix frontend run dev`

## URLs

- Frontend: http://localhost:5173
- Backend health: http://localhost:4000/api/health
