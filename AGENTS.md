<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Agent Guidance

All agents working in this repository must read and apply the architecture ethos in `docs/ethos/architecture-ethos.md`.

That document is the standard for how this codebase should evolve. Do not treat it as optional reference material. Embody it while implementing changes and review your own work against it before finishing.

## Non-Negotiable Priorities

- Preserve strict separation of concerns.
- Avoid monolith files and responsibility creep.
- Keep page files thin and composition-focused.
- Isolate motion, visual effects, content data, and reusable UI primitives into appropriate modules.
- Prefer explicit, readable architecture over clever compression.

## Local Agent Docs

Agents should create additional local `AGENTS.md` files throughout the repository when a subsystem or module has important local rules, architecture constraints, extension guidance, or context that future agents should inherit.

Examples of when local `AGENTS.md` files are warranted:

- a subsystem has special boundaries that must not be crossed
- a directory has established extension patterns
- a module has non-obvious performance or rendering constraints
- a local visual or motion system has standards that should stay near the code
- future contributors would otherwise need to rediscover important context

Local `AGENTS.md` files should be concise, practical, and specific to the directory they live in.
