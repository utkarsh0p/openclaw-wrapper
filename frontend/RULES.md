# Frontend Rules

## Product Rules

- Build the frontend as the organization-facing control surface for OpenClaw.
- Do not model the UI as a clone of OpenClaw's TUI or generic dashboard.
- Keep the current MVP to one plain user experience unless scope is explicitly expanded.
- Assume future users may include a CEO and employees across different departments.
- Favor role-specific assistant experiences later, but do not force that complexity into the current MVP.

## Integration Rules

- Treat gateway connection logic as a dedicated frontend transport layer.
- Keep handshake, connection lifecycle, streaming state, and reconnect behavior explicit.
- Do not spread low-level gateway protocol handling across unrelated components.
- UI actions that imply real business operations should be mapped to actual available tools or integrations, not just prompt wording.

## UX Rules

- The MVP can stay simple, but new UI work should move toward department-aware workflows.
- Surface what an assistant can actually do, not just what the user can ask in natural language.
- Prefer clear boundaries, approvals, and visible state for business actions.
