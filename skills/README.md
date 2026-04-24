# OpenRacer skills

Reference material for AI-assisted development. Each skill is a focused knowledge base for a specific concern.

## The three skills

### `design-system/`
**When to use:** any UI work, any time you're picking colours, fonts, spacing, or component structure.

Covers the complete visual language of OpenRacer. Tokens, typography, component patterns, screen layouts, night mode, accessibility. Also includes a rendered HTML mockup of the mark library as a design touchstone.

Open `mockups/mark-library.html` in a browser to see the visual style rendered.

### `offline-first/`
**When to use:** any feature that reads or writes remote data, or that could ever be affected by network state.

Covers the three-connectivity-mode architecture (offline / patchy / constant), feature design patterns, storage rules, queue management, and the Starlink-era amplification model. Includes a catalogue of features by connectivity tier.

### `marine-domain/`
**When to use:** any time you're writing marine-specific code or user-facing text.

Covers sailing terminology, units, coordinate formats, wind physics (apparent vs true), racing concepts, safety features, SignalK naming conventions, and common pitfalls. The primer a non-sailor developer needs.

## How Claude Code uses these

`CLAUDE.md` at the project root tells Claude Code:
- Read a skill's `SKILL.md` at the START of any task that touches its area
- The skill is the source of truth for decisions in that area
- When two skills seem to conflict, ask — they shouldn't

## When to update a skill

Skills evolve with the project. Update when:

- An architectural decision changes (note: they rarely should; see `docs/decisions.md`)
- A new pattern emerges that should be documented
- Real-world testing reveals the skill got something wrong
- A feature area gets complex enough to deserve its own skill

Skills are version-controlled alongside code. Commit skill updates atomically with the code changes that motivated them.

## Future skills (probably)

As the project grows, we may add:

- **signalk-integration/** — when Phase 6 wires up actual SignalK servers
- **hardware-integration/** — when Phase 10 adds the sensor kit
- **ai-prompting/** — when Phase 4+ has opinions about prompt patterns
- **mcp-server/** — when Phase 8 builds the MCP interface

Not now. Adding skills before we need them is over-engineering.
