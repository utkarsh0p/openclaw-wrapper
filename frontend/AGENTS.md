# Frontend Repository Guidelines

## Scope

These instructions apply to work inside `frontend/`.

## Frontend Goal

The frontend is the main product surface for this project.

- It is not meant to mimic OpenClaw's TUI or generic control UI.
- The current MVP is only a plain user plus gateway-connection flow.
- It should later evolve into a business-facing interface for employees and leadership.
- Different roles should eventually interact with different assistants, actions, and workflows.
- Frontend work should support that product direction without prematurely adding that complexity now.

## Coding Style & Naming Conventions

Use 2-space indentation in JavaScript and JSX. Prefer small focused components, `const` by default, and keep naming consistent with the existing frontend codebase.

- Use `PascalCase` for React components.
- Use `camelCase` for variables, hooks, helpers, and functions.
- Keep frontend files descriptive by role.

## Agent Context Files

- Follow `STYLES.md` for style-specific guidance.
- Follow `RULES.md` for frontend rules and behavioral constraints.
- Follow `../OPENCLAW_GATEWAY.md` for anything related to OpenClaw gateway behavior, protocol, streaming expectations, and frontend integration decisions.
- Load the relevant guidance Markdown files into context before working when they exist.
- Load `../OPENCLAW_GATEWAY.md` into context before working on gateway-connected UI or transport behavior.
- If tracked Markdown files change, reload relevant Markdown guidance files into context before continuing. This includes cases where Git shows a tracked file as `modified`, such as `STYLES.md`, `RULES.md`, `../OPENCLAW_GATEWAY.md`, `README.md`, or `AGENTS.md`.
