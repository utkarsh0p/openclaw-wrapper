# Repository Guidelines

## Project Goal

This repo is building a business-facing web app that wraps OpenClaw for organizational use.

- OpenClaw is the lower-level execution and orchestration layer.
- This app is the product surface.
- Different departments should eventually get different assistants tailored to their domain, constraints, and workflows.
- The project should prefer wrapping and constraining OpenClaw over rebuilding a separate agent framework from scratch.
- Do not introduce heavier agent orchestration stacks such as LangGraph unless there is a demonstrated gap that OpenClaw cannot cover.

## Current MVP Scope

Treat the current scope as intentionally minimal:

- one plain user flow
- direct gateway connection
- no auth system yet
- no admin/employee separation yet
- no agent-management UI yet
- no complex org workflows yet

The current goal is to prove the wrapper architecture with a working frontend-to-gateway experience.

## Future Direction

Future architecture may add:

- backend `admin` and `employee` user types
- the CEO as the initial admin
- agent creation and assignment flows
- richer role-based access and workflows

When in doubt, optimize for:

- role-specific assistants instead of a single generic assistant
- controlled business actions instead of unrestricted tool access
- custom product UX instead of generic OpenClaw UI assumptions
- extending the current wrapper architecture instead of replacing it

## Project Structure & Module Organization

This repository is a small MERN-style monorepo:

- `backend/`: Express + MongoDB integration layer retained for later org features.
- `backend/src/routes`: REST endpoints for auth, projects, and agent commands from the earlier backend-assisted path.
- `backend/src/services`: gateway connection and run-event persistence pipeline from the earlier backend-assisted path.
- `frontend/`: React + Vite + Tailwind frontend for the direct gateway MVP.
- `frontend/src/components`: UI components such as `AgentConsole.jsx` for the current MVP shell.
- Root files: `docker-compose.yml`, `.env.example`, and `README.md` for local and containerized setup.

## Build, Test, and Development Commands

Run commands from the relevant package directory unless noted otherwise.

- `cd backend && npm install && npm run dev`: start the API with `nodemon`.
- `cd backend && npm start`: run the backend in production mode.
- `cd backend && npm run check`: syntax-check `src/server.js`.
- `cd frontend && npm install && npm run dev`: start the Vite frontend locally.
- `cd frontend && npm run build`: create the production frontend bundle.
- `docker compose up --build`: build and run the current frontend + OpenClaw MVP stack.

## Coding Style & Naming Conventions

Use 2-space indentation in JavaScript and JSX. Prefer ES modules, `const` by default, and small focused functions. Use:

- `PascalCase` for React components and Mongoose models.
- `camelCase` for variables, helpers, and functions.
- Descriptive filenames by role, for example `GatewayManager.js`, `requireAuth.js`.

No formatter or linter is configured yet, so keep style consistent with the existing files.

## Agent Context Files

- Follow `RULES.md` for repository rules and behavioral constraints.
- Follow `OPENCLAW_GATEWAY.md` for anything related to OpenClaw gateway behavior, protocol, frontend/backend integration expectations, and implementation direction in this repo.
- Load the relevant guidance Markdown files into context before working when they exist.
- Load `OPENCLAW_GATEWAY.md` into context before working on gateway, streaming, transport, or frontend/backend bridge tasks.
- If tracked Markdown files change, reload relevant Markdown guidance files into context before continuing. This includes cases where Git shows a tracked file as `modified`, such as `RULES.md`, `OPENCLAW_GATEWAY.md`, `README.md`, or `AGENTS.md`.

## Testing Guidelines

Automated tests are not set up yet. Until a test runner is added:

- Run `node --check backend/src/server.js` and `npm run build` in `frontend/` before submitting.
- Manually verify the current gateway-connected MVP flow end to end.
- For frontend work, verify gateway connected state, prompt submit, streamed updates, and final response rendering.
- Add future tests near the code they cover or under a dedicated `test/` directory.

## Commit & Pull Request Guidelines

Git history is not available in this workspace, so use a simple convention going forward:

- Commit format: `scope: short imperative summary` such as `backend: persist final OpenClaw summaries`.
- Keep commits focused; avoid mixing frontend, backend, and Docker refactors without reason.
- PRs should include a summary, affected areas, env or protocol changes, manual verification steps, and UI screenshots for frontend changes.
- When a feature changes setup, architecture, workflows, or commands, update `README.md` and `AGENTS.md` in the same PR.

## Security & Configuration Tips

Do not commit real secrets. Copy from `.env.example` or `frontend/.env.example`, keep `OPENCLAW_GATEWAY_TOKEN` local, and update the gateway integration layer if your OpenClaw deployment differs from the documented assumption.
