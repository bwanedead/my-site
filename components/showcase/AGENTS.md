# Showcase Subsystem Guidance

This directory owns the one-page project showcase structure layered above the ASCII background.

## Boundaries

- Keep the page route thin. Major composition should live here, not in `app/page.tsx`.
- Keep reusable ASCII background logic in `components/ascii`.
- Keep project list data separate from presentation components.
- Keep navigation behavior separate from section rendering.

## Standards

- The showcase shell should feel deliberate, restrained, and high-contrast.
- Do not let placeholder content become generic portfolio filler.
- Avoid oversized all-in-one files. Split navigation, section rendering, and wordmark logic.
- If future content becomes real case-study material, expand by composing new modules instead of bloating the existing section component.
