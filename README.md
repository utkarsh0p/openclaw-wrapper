# OpenClaw Executive Console

MERN web layer for a running OpenClaw Gateway, with a simple chat MVP over the local gateway.

## Architecture

- `frontend`: React + Tailwind chat MVP
- `backend`: Express + Socket.io + MongoDB + OpenClaw WebSocket bridge
- `mongo`: persistence for projects and business intelligence reports
- `openclaw`: assumed to expose the gateway on port `18789` inside the Docker network

Data flow:

1. User submits a message in the React UI.
2. Express creates an `AgentRun` record in MongoDB.
3. `GatewayManager` forwards the task to OpenClaw over WebSocket.
4. Gateway events stream back through Socket.io.
5. Final output is saved as a business intelligence report.

## Environment

Copy these templates before running:

- `/.env.example` -> `/.env`
- `backend/.env.example` -> `backend/.env`
- `frontend/.env.example` -> `frontend/.env`

Critical backend variables:

- `MONGODB_URI`
- `APP_JWT_SECRET`
- `CEO_ACCESS_KEY`
- `OPENCLAW_GATEWAY_URL`
- `OPENCLAW_GATEWAY_TOKEN`
- `CLIENT_ORIGIN`

## Run with Docker Compose

```bash
docker compose up --build
```

Default URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`
- MongoDB: `mongodb://localhost:27017`

## MVP UI

The frontend is intentionally simple:

- auto-creates or reuses one default project
- authenticates with the backend and opens a Socket.io stream
- shows gateway connectivity
- lets you send prompts to the local `main` OpenClaw agent
- renders run history as a lightweight chat transcript

## Notes on OpenClaw Protocol

This implementation assumes the gateway uses JSON messages with request, response, and event types similar to:

- `handshake`
- `req:agent`
- `event:agent`
- `event:tool`
- `res:agent`

If your OpenClaw build uses different field names, adjust `backend/src/services/GatewayManager.js`.

## Documentation Maintenance

Keep this README and `AGENTS.md` current when new features change architecture, environment variables, commands, or contributor workflow. Documentation updates should ship in the same change set as the feature.
# openclaw-wrapper
