# Architecture Ethos

This document defines the engineering standards for this codebase.

These standards are not decorative. They exist to prevent entropy, preserve clarity, and keep the site maintainable as it grows from an aesthetic-first shell into a serious work showcase platform.

The operating assumption is simple:

Elite software is not produced by bursts of cleverness.
It is produced by sustained architectural discipline.

That discipline must be maintained at all costs.

## Prime Directive

The system must remain:

- modular
- legible
- composable
- locally understandable
- easy to extend without collateral damage
- difficult to accidentally degrade

The codebase must never drift into a state where one change requires touching unrelated concerns, where behavior is hidden inside giant files, or where future contributors need archeology to make safe changes.

If there is ever tension between speed and architectural integrity, the default stance is:

Prefer the change that preserves long-term clarity.

## Separation Of Concerns Is Non-Negotiable

Separation of concerns is not a style preference. It is a survival requirement.

Every meaningful concern in the system should have a clear home:

- routing and page composition
- reusable UI primitives
- motion behavior
- visual effects
- content models and data
- styling tokens and global visual language
- domain-specific helpers
- external integration logic

These concerns must not collapse into each other.

A page file should not become a dumping ground for:

- giant inline visual systems
- ad hoc data blobs
- reusable helper functions
- styling systems that belong globally
- animation primitives that should be shared
- business or content logic unrelated to routing/composition

A component should not become responsible for:

- fetching unrelated data
- formatting unrelated content
- owning layout policy for the entire application
- embedding one-off logic that should live in a utility or subsystem

A utility module should not quietly become:

- a second application layer
- a random bucket of unrelated helpers
- an escape hatch for poor design upstream

When concerns mix, complexity compounds. When they are separated correctly, the system stays calm under change.

## Avoid Monolith Files

Monolith files are architectural failure in slow motion.

They make every future edit riskier. They hide boundaries. They incentivize copy-paste. They make review quality worse. They guarantee that context becomes expensive.

This repository must aggressively resist:

- page files that become hundreds of lines long because every section is defined inline
- components that render too many unrelated states or responsibilities
- giant CSS files that encode local styling instead of global primitives
- large utility files with mixed purposes
- data files that also transform, render, and orchestrate behavior

Preferred pattern:

- page files compose sections
- sections compose primitives
- primitives stay focused
- helpers stay narrow
- data stays separate from presentation
- effects stay isolated from content structure

If a file starts feeling “conveniently central,” that is often the warning sign that it is becoming load-bearing in the wrong way.

### File Size Discipline

There is no single magic line count, but there is a clear standard:

If a file is becoming difficult to scan, reason about, or review in one pass, it is already too large.

Expected discipline:

- split before pain becomes normal
- split before reuse is urgently needed
- split when a file contains multiple conceptual layers
- split when naming internal blocks becomes easier than understanding the file itself

A small number of slightly larger files is acceptable when the responsibility is truly singular.
A giant file with mixed responsibilities is not.

## Composition Over Accretion

The system should grow by composition, not by piling exceptions into existing files.

Good growth looks like this:

- a new feature is introduced as a new module
- existing primitives are reused where appropriate
- the new logic touches only the layers it actually belongs to
- the feature can be removed without tearing through unrelated code

Bad growth looks like this:

- one more conditional in a crowded component
- one more prop to support a single edge case
- one more block of local styles in a page
- one more helper added to a generic “utils” file
- one more effect piggybacking on a component that already does too much

Each addition must preserve or improve the system’s shape.

## Strong Module Boundaries

Modules should be designed so their responsibility is obvious from their name and location.

Desired properties of a module:

- it has a single dominant reason to change
- its inputs are clear
- its outputs are clear
- its internal complexity does not leak outward
- it can be tested or reasoned about in isolation

Boundary violations to avoid:

- UI modules importing unrelated domain logic directly
- effects modules controlling page content structure
- shared components encoding route-specific assumptions
- data modules importing UI concerns
- styling rules coupled tightly to one-off markup structures when they should be primitive-level abstractions

When a module has multiple equally important responsibilities, it likely needs to be split.

## Pages Should Be Thin

Page-level files should primarily do orchestration:

- define page structure
- select sections
- pass data downward
- declare route-level metadata

Page files should not become implementation swamps.

A healthy page file is readable at a glance. Someone opening it should understand the major parts of the page quickly without needing to parse animation internals, large style systems, low-level canvas behavior, or content data objects.

## Reusable Primitives Must Stay Honest

Shared primitives are high leverage, so they require discipline.

A primitive should:

- solve one recurring problem well
- expose a small, stable API
- remain decoupled from route-specific content
- avoid speculative abstraction

A primitive should not:

- accumulate flags for every use case
- become impossible to understand because it serves too many masters
- encode product-specific assumptions while pretending to be generic

The moment a “shared” abstraction only works because it contains several special cases, it is probably no longer a good abstraction.

## Prefer Explicitness Over Cleverness

Code should be easy to read correctly.

This repository should prefer:

- obvious naming
- direct control flow
- explicit data shapes
- boring but reliable composition

This repository should avoid:

- dense clever abstractions
- magical helper layers
- hidden mutations
- unclear ownership
- compressed patterns that save lines while increasing ambiguity

Sophistication should appear in architecture, not in obscurity.

## Styling System Standards

Visual quality matters here, but styling must still respect architecture.

The styling system should be layered:

- global tokens define palette, typography, spacing intent, and surface language
- reusable primitives express common shells and visual motifs
- local components use those primitives and only add local rules when necessary

Do not scatter visual decisions randomly across the tree.

Avoid:

- magic values repeated in many files
- route-specific classes becoming de facto design tokens
- effect styling embedded where a reusable primitive should exist
- local visual hacks that bypass the system

The design language should be centralized enough to remain coherent, but not so centralized that every component becomes hostage to one giant stylesheet.

## Motion Standards

Motion is part of the product language, not decoration.

Motion code must be:

- restrained
- consistent
- reusable
- performance-aware
- separable from content structure

Motion modules should not sprawl through page code. Repeated transitions, reveal behavior, and interaction patterns belong in dedicated motion primitives or focused modules.

Avoid:

- bespoke animation logic duplicated across sections
- effects intertwined with content definitions
- gratuitous motion that obscures hierarchy
- performance-hostile animation inside already heavy modules

Motion should support meaning, not compete with it.

## Visual Effects Standards

Effects are valuable here, but they are also the easiest way to ruin the codebase.

All atmospheric systems must be isolated and controlled:

- canvas effects belong in dedicated effect modules
- signal treatments should be additive, not structurally invasive
- effect code should not dictate content architecture
- expensive rendering paths must justify themselves

Never let “cool effect” energy turn the code into a lab notebook.

The correct pattern is:

- isolate
- name clearly
- compose deliberately
- measure impact
- keep an exit path

## Data And Content Separation

Content should not be trapped inside large UI files.

Project records, placeholder content, and future content models should live in focused data modules or content systems, separate from rendering concerns.

That separation matters because it:

- keeps components smaller
- keeps content easier to replace
- reduces noise during design iterations
- makes future CMS or content-pipeline changes possible

If content is embedded directly into many components, future migration cost rises immediately.

## Naming Standards

Naming is architecture.

Names should communicate:

- role
- scope
- level of abstraction
- ownership

Avoid vague names like:

- `helpers`
- `thing`
- `misc`
- `common`
- `manager`
- `utils` for heterogeneous responsibilities

Prefer names that indicate what a module actually is:

- `signal-panel`
- `motion-reveal`
- `site-content`
- `project-preview-section`

Good naming lowers architectural entropy before any code is read.

## Review Standards

Every meaningful change should be reviewed against architecture, not just behavior.

Review questions that must be asked:

- Does this preserve separation of concerns?
- Does this increase or reduce file responsibility creep?
- Is this the correct module boundary?
- Is a new abstraction justified?
- Does this add complexity in the right layer?
- Is this too coupled to one route or one use case?
- Is this readable for the next engineer without oral history?

Code that works but damages the system should still be considered substandard.

## Locality Of Knowledge

Important subsystem context must live near the subsystem.

As the codebase grows, local guidance should be documented with local `AGENTS.md` files in relevant directories when a subsystem has:

- special constraints
- unusual architectural rules
- important extension patterns
- common failure modes
- decisions future contributors need to preserve

This prevents all knowledge from bottlenecking in a single root document.

## Refactoring Standard

Refactoring is required when structure degrades.

Do not normalize:

- bloated files
- duplicated logic
- component responsibility drift
- styling drift
- motion drift
- creeping dependency tangles

If the right architecture is clear, move toward it before the mess becomes institutionalized.

The repository should be kept in a state where meaningful work can continue without fear.

## What “Elite” Means Here

Elite does not mean maximal abstraction.
Elite does not mean clever code.
Elite does not mean ornamental complexity.

Elite means:

- the system remains understandable under pressure
- changes stay local whenever possible
- responsibilities are obvious
- modules are shaped intentionally
- aesthetics do not excuse architectural sloppiness
- the codebase gets stronger as it grows instead of weaker

That is the standard.

Anything that undermines those properties should be treated as debt immediately, not later.
