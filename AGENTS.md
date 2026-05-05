# Repository Guidelines

## Project Structure & Module Organization

This repository is a small MERN-style monorepo:

- `backend/`: Express API, MongoDB models, Socket.io server, and the OpenClaw WebSocket bridge.
- `backend/src/routes`: REST endpoints for auth, projects, and agent commands.
- `backend/src/services`: gateway connection and run-event persistence pipeline.
- `frontend/`: React + Vite + Tailwind CEO console.
- `frontend/src/components`: UI components such as `AgentConsole.jsx` for the chat MVP.
- Root files: `docker-compose.yml`, `.env.example`, and `README.md` for local and containerized setup.

## Build, Test, and Development Commands

Run commands from the relevant package directory unless noted otherwise.

- `cd backend && npm install && npm run dev`: start the API with `nodemon`.
- `cd backend && npm start`: run the backend in production mode.
- `cd backend && npm run check`: syntax-check `src/server.js`.
- `cd frontend && npm install && npm run dev`: start the Vite frontend locally.
- `cd frontend && npm run build`: create the production frontend bundle.
- `docker compose up --build`: build and run MongoDB, backend, frontend, and OpenClaw networking together.

## Coding Style & Naming Conventions

Use 2-space indentation in JavaScript and JSX. Prefer ES modules, `const` by default, and small focused functions. Use:

- `PascalCase` for React components and Mongoose models.
- `camelCase` for variables, helpers, and functions.
- Descriptive filenames by role, for example `GatewayManager.js`, `requireAuth.js`.

No formatter or linter is configured yet, so keep style consistent with the existing files.

## Testing Guidelines

Automated tests are not set up yet. Until a test runner is added:

- Run `node --check backend/src/server.js` and `npm run build` in `frontend/` before submitting.
- Manually verify auth flow, project creation, command dispatch, Socket.io streaming, and final report persistence.
- For frontend work, verify the MVP chat flow end to end: login, gateway connected state, prompt submit, streamed updates, and final response rendering.
- Add future tests near the code they cover or under a dedicated `test/` directory.

## Commit & Pull Request Guidelines

Git history is not available in this workspace, so use a simple convention going forward:

- Commit format: `scope: short imperative summary` such as `backend: persist final OpenClaw summaries`.
- Keep commits focused; avoid mixing frontend, backend, and Docker refactors without reason.
- PRs should include a summary, affected areas, env or protocol changes, manual verification steps, and UI screenshots for frontend changes.
- When a feature changes setup, architecture, workflows, or commands, update `README.md` and `AGENTS.md` in the same PR.

## Security & Configuration Tips

Do not commit real secrets. Copy from `.env.example`, keep `OPENCLAW_GATEWAY_TOKEN`, `APP_JWT_SECRET`, and `CEO_ACCESS_KEY` local, and update `backend/src/services/GatewayManager.js` if your OpenClaw gateway message schema differs from the documented assumption.
