# OpenClaw Gateway Reference

## Purpose In This Repo

This project uses OpenClaw as the execution and orchestration layer behind a custom organizational web app.

The app-level product direction is:

- Do not build a full custom agent framework from scratch if OpenClaw already provides the lower-level agent runtime.
- Use OpenClaw behind the scenes as the bottom layer and wrap it with this app's own UI, auth, project model, role model, and department-specific agent experiences.
- Treat department agents as customized assistants for business functions like marketing, operations, leadership, and internal support.
- Keep agent specialization mostly in app-side configuration, prompts, allowed actions, workflow constraints, and frontend UX instead of rebuilding orchestration with heavier frameworks unless there is a clear gap.
- Natural-language business requests should be backed by real tools, channels, data sources, or app integrations when execution is expected.

## Current MVP Direction

- The current MVP maps the OpenClaw Gateway to a new frontend.
- The MVP is only a plain user plus gateway-connection flow for now.
- OpenClaw is intended to run on a VPS for this project.
- The app does not need TUI or other OpenClaw end-user interfaces for this use case.
- The main integration surface is the Gateway control plane connected to the custom frontend.
- Auth, admin/employee separation, agent assignment, and richer org features can be added after successful gateway/frontend testing.
- When making product or architecture decisions, prefer extending the current wrapper approach before introducing separate agent stacks such as LangGraph unless OpenClaw cannot cover the requirement.

## What The Gateway Is

OpenClaw's Gateway is the WebSocket control plane for the system. It handles clients, sessions, nodes, hooks, and RPC/event traffic.

Relevant operational facts from the current docs:

- The gateway runs as `openclaw gateway` or `openclaw gateway run`.
- The default WebSocket port is usually `18789`.
- It uses WebSocket JSON frames.
- The first protocol action is a `connect` handshake.
- Operator clients such as CLI or web UI connect with a role and scopes.
- Nodes connect separately with capabilities, commands, and permissions.

## Protocol Notes For Frontend Integration

The frontend/backend wrapper in this repo should treat the gateway as a role-and-scope-based WebSocket RPC service.

Important protocol details:

- Transport is WebSocket with text JSON payloads.
- The first frame must be a `connect` request after the gateway sends `connect.challenge`.
- Core frame types are request, response, and event.
- An operator-style client typically connects with scopes like `operator.read` and `operator.write`.
- The server replies with `hello-ok` when the handshake succeeds.
- The handshake can also return `hello-ok.auth.deviceToken`, which clients should persist for reconnects.
- The exact public surface is broader than a single chat endpoint and includes status, models, channels, logs, agent/session helpers, approvals, and more.

Practical implication for this repo:

- The web app should act as a controlled operator client to the gateway surface.
- The app should expose only the business-safe subset needed by each department experience.
- Avoid giving every frontend surface raw unrestricted gateway access even if the frontend connects directly.

## Security Guidance

Use a conservative integration posture:

- Prefer local or tightly controlled deployment while the MVP is being validated.
- Do not expose insecure gateway modes on public or untrusted ingress.
- Binding beyond loopback without auth is blocked by OpenClaw as a safety guardrail; keep the same mindset in this app.
- Shared-secret auth uses token or password depending on gateway configuration.
- Device tokens are issued after pairing/approval and should be persisted carefully.
- TLS is supported for WebSocket connections, and certificate pinning is available.

For this project, the safest default assumption is:

- OpenClaw runs on a VPS and the custom frontend connects to the gateway as the primary operator surface.
- The gateway must still be protected with strong auth, scoped access, TLS, and careful exposure rules because it is a powerful control plane.
- Frontend connection patterns should be designed so only the intended app users can reach and use the gateway.

## Implementation Guidance For This Repo

When working on gateway-related code in this repo:

- Assume the frontend may connect directly to the VPS-hosted gateway for the MVP.
- Keep frontend components focused on organizational UX, streaming state, approvals, agent selection, and department workflows.
- Keep OpenClaw-specific handshake handling, reconnect logic, event normalization, and gateway session state explicit and well-contained in the frontend integration layer.
- If a feature can be implemented by adapting OpenClaw gateway behavior and wrapping it in app logic, prefer that over introducing a second agent orchestration layer.
- Only introduce heavier custom agent workflow infrastructure if the OpenClaw gateway and its RPC/event surface cannot support the needed control.

## Direct Frontend Connection Notes

Because the frontend is intended to connect to the gateway directly:

- Gateway-facing frontend code should be treated as a dedicated transport layer, not mixed across general UI code.
- Keep the connection lifecycle explicit: connect challenge, handshake, hello state, stream events, reconnect, and error handling.
- Department-specific agents should still be represented as app-level products built on top of gateway sessions, prompts, scopes, and allowed actions.
- Do not reintroduce OpenClaw TUI assumptions into this app architecture.

## Capability Model For This Project

For future work in this repo, use this rule:

- A user can ask for a task in natural language.
- The assistant can execute that task only if the required tool or integration exists and is allowed.

Examples:

- "Give me today's report" requires a real report data path.
- "Send this update to an employee" requires a real supported channel or app-side delivery integration.
- "Do marketing analysis for today" may require internal analytics, CRM, or reporting integrations in addition to prompting.

This project should therefore evolve around constrained business capabilities, not just free-form prompting.

## Where To Check Next

For gateway/frontend work, consult this file first, then the OpenClaw docs and repo paths below:

- Gateway CLI docs: https://docs.openclaw.ai/cli/gateway
- Gateway protocol docs: https://docs.openclaw.ai/gateway/protocol
- Official repo: https://github.com/openclaw/openclaw
- Protocol doc in repo: `docs/gateway/protocol.md`
- Schema reference noted by docs: `src/gateway/protocol/schema.ts`
- Method discovery list noted by docs: `src/gateway/server-methods-list.ts`

## Source Notes

This file is based on the OpenClaw documentation and official repo references available on May 6, 2026.

Key source-backed points used above:

- The gateway is OpenClaw's WebSocket server and control plane.
- The default gateway port is usually `18789`.
- The protocol uses WebSocket JSON frames and starts with a `connect` handshake.
- Clients connect with declared roles and scopes.
- Shared-secret auth can use token or password.
- Device tokens are returned in `hello-ok.auth.deviceToken`.
- TLS and certificate pinning are supported.

Source URLs:

- https://docs.openclaw.ai/cli/gateway
- https://docs.openclaw.ai/gateway/protocol
- https://github.com/openclaw/openclaw/blob/main/docs/gateway/protocol.md
