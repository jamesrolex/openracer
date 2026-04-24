# First-session prompt

Copy everything between the `---` lines and paste as your very first message to Claude Code.

---

Hello. Please start by reading `CLAUDE.md`, then `docs/phase-0-plan.md`, then `docs/decisions.md`. Take your time with those three files — they define what we're doing and what we're explicitly NOT doing.

When you've read them:

1. Confirm back to me in one short paragraph what Phase 0 is, and what's out of scope. I want to know you understood it before we touch any code.
2. List any questions you have about the plan. If the answers are obvious from the docs or you can pick a sensible default, do that instead and just note the decision.
3. Propose the order you'll tackle the Phase 0 tasks. I'd expect something like: scaffold → structure → types/utils with tests → hooks → stores → HomeScreen → airplane-mode test.

Then stop and wait for my go-ahead before running any commands.

Context about me: I'm the project owner. IT-literate but not a developer. British English, metric units. Dyslexic, so clear visual structure helps — short paragraphs, avoid walls of text. Prefer direct answers, no hedging. If you hit a decision point, make the sensible call and tell me what you chose; don't paralyse us with questions.

---

## After the first session

When Claude Code finishes Phase 0 and passes the exit gate, paste this to kick off Phase 1:

---

Phase 0 is complete and the exit gate passes (GPS works in airplane mode on both iOS and Android, tests pass, typecheck clean, conventional commits throughout).

Before we start Phase 1, I want to plan it properly. Read `docs/openracer_spec_v0.6.docx` Part 1 (course entry — the hero feature) and `docs/spec-summary.md`. Then:

1. Propose a Phase 1 plan at the same level of detail as `docs/phase-0-plan.md`. Save it as `docs/phase-1-plan.md`. Include the OUT OF SCOPE section explicitly.
2. Phase 1 is 8 weeks. Break it into weekly milestones with exit gates.
3. Start with the mark data model and library screen (weeks 1-2), then build course entry methods one at a time in order of impact (library pick → committee push → drop-at-GPS → bearing+distance → chart tap → chart seamarks → point-at-mark), then race timer + start line (weeks 7-8).

Don't start implementing Phase 1 yet. Just write the plan and we'll review together.

---
