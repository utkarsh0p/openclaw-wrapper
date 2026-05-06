# OpenClaw Executive Console

Organization-facing web app built on top of OpenClaw. The product goal is to use OpenClaw as the hidden runtime and control layer while this app provides the business-facing UI and assistant experiences.

Today the repo is still in MVP form. Right now the focus is a plain user flow with direct gateway connection. The long-term direction is still "custom company app that wraps OpenClaw for different employee roles."

Examples of intended role-specific assistants:

- marketing assistant
- operations assistant
- leadership or CEO assistant
- internal support or team-specific assistants

## Architecture

- `frontend`: React + Tailwind web app and current direct-gateway MVP
- `backend`: Express + MongoDB integration layer kept for later org features
- `mongo`: persistence layer kept for later org features
- `openclaw`: execution layer exposed through the Gateway control plane

Target deployment direction:

- OpenClaw runs on a VPS.
- The custom frontend is the main user-facing control surface.
- TUI or other OpenClaw end-user surfaces are not part of the intended product.
- The frontend is expected to connect to the gateway directly for the MVP path.

Data flow:

1. User submits a message in the React UI.
2. The frontend connects directly to the OpenClaw Gateway.
3. OpenClaw handles the lower-level agent execution and streaming through the Gateway.
4. The app renders the interaction in custom UI.
5. Later, the product can grow into richer org-specific workflows, auth, and persistence layers.

## Product Direction

The main architectural goal is simplification:

- do not build a full custom agent framework from scratch unless necessary
- do not default to heavier orchestration stacks such as LangGraph unless OpenClaw cannot cover a requirement
- use OpenClaw behind the scenes for runtime, tools, sessions, and execution flows
- keep business logic, UX, permissions, and employee-facing workflows in this app

This means the real product value is in:

- role-specific assistants
- company-specific permissions and workflows
- safe business actions per department
- custom frontend and internal UX

It does not come from replacing OpenClaw's agent runtime with another orchestration layer too early.

## Current MVP Scope

For now, keep the MVP minimal:

- one plain user flow
- direct gateway connection
- no auth system yet
- no admin/employee separation yet
- no agent creation or assignment UI yet
- no complex org workflows yet
- no required backend bridge in the current live frontend path

The MVP's job is to prove that the custom frontend can successfully connect to OpenClaw and act as the wrapper product surface.

## Future Product Direction

Later architecture can add:

- backend user records with `admin` and `employee`
- the CEO as the initial admin
- admin-controlled agent creation and assignment
- employee-specific access to assigned assistants
- richer org workflows, reports, approvals, and actions

## Agent Capability Model

Users should eventually be able to ask for natural business tasks such as:

- "give me today's report"
- "send this update to the marketing team"
- "prepare a summary for the CEO"

Whether an agent can actually complete such a request depends on the available tool and data path.

- OpenClaw tools are the executable actions.
- OpenClaw skills teach the agent how and when to use them.
- App-side integrations and constraints decide what each department agent is allowed to do.

So the project should evolve toward constrained, role-specific assistants rather than one unrestricted generic agent.

## Environment

Copy these templates before running:

- `/.env.example` -> `/.env`
- `backend/.env.example` -> `backend/.env`
- `frontend/.env.example` -> `frontend/.env`

Important environment variables used in the current codebase include:

- `OPENCLAW_GATEWAY_URL`
- `OPENCLAW_GATEWAY_TOKEN`
- `OPENCLAW_AGENT_ID`

## Run with Docker Compose

```bash
docker compose up --build
```

Default URLs:

- Frontend: `http://localhost:5173`
- Gateway: `ws://localhost:18789`

## MVP UI

The frontend is intentionally simple:

- currently focuses on basic direct gateway-connected interaction flow
- shows gateway connectivity
- lets you send prompts to the current OpenClaw agent path
- renders the active session as a lightweight chat transcript

This should be treated as an early transport and UX test bed, not the final product shape.

## Notes on OpenClaw Protocol

OpenClaw Gateway protocol details and repo-specific assumptions are documented in `OPENCLAW_GATEWAY.md`.

The current frontend MVP assumes the documented WebSocket flow:

- gateway sends `connect.challenge`
- frontend replies with a `connect` request
- frontend sends `chat.send` requests after handshake
- gateway emits request/response/event JSON frames during the session

If your OpenClaw build or deployment policy differs, adjust the frontend integration layer accordingly.

## Documentation Maintenance

Keep this README, `AGENTS.md`, `OPENCLAW_GATEWAY.md`, `RULES.md`, and the frontend Markdown guidance files current when the architecture or workflow changes. Documentation updates should ship in the same change set as the feature.
