# Repository Rules

## Product Rules

- Treat this project as an organization-facing wrapper around OpenClaw, not as a separate agent framework.
- Prefer adapting OpenClaw's gateway, tools, skills, sessions, and control surfaces before introducing new orchestration layers.
- Do not add LangGraph or similar agent frameworks unless the requirement cannot be covered cleanly by OpenClaw.
- Keep the current MVP intentionally simple unless the user explicitly expands scope.
- Department agents should be specialized through app logic, prompts, skills, allowed actions, and UX constraints.
- Avoid designs that collapse all department assistants into one unrestricted general-purpose agent.

## Integration Rules

- Assume OpenClaw runs on a VPS and is accessed through the Gateway control plane.
- For gateway-related work, consult `OPENCLAW_GATEWAY.md` first.
- Keep gateway transport concerns explicit and isolated from unrelated UI code.
- Treat natural-language requests as executable only when the required tool, channel, data source, or integration exists.
- Distinguish clearly between "agent can answer" and "agent can perform the action."

## Documentation Rules

- Keep Markdown guidance files current when architecture or workflow assumptions change.
- If project direction changes, update `README.md`, `AGENTS.md`, and `OPENCLAW_GATEWAY.md` in the same change.
