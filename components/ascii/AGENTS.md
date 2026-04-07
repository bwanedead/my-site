# ASCII Subsystem Guidance

This directory owns the ASCII visual layer for the site.

## Boundaries

- Keep page-level composition out of this directory.
- Keep routing, copy, and content structure out of this directory.
- Keep reusable ASCII rendering logic separate from the React wrapper when possible.

## Standards

- Treat this subsystem as a primary visual layer, not a dumping ground for experiments.
- Favor restrained, high-taste signal aesthetics over novelty or noisy glitch spam.
- Preserve performance. Large increases in per-frame work need a strong reason.
- Keep browser-only animation and canvas code inside client components or renderer helpers.
- If the effect grows new concerns, split them instead of expanding one file indefinitely.

## Modification Guidance

- Tune character sets, field math, and overlays deliberately.
- Avoid introducing route-specific assumptions here.
- Document non-obvious performance constraints if the renderer becomes more complex.
- Keep diagnostics and observability sidecars separate from the renderer math.
- If multiple canvases are stacked, upper layers must stay transparent if lower layers are meant to remain visible.
