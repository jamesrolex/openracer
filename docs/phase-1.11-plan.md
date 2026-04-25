# Phase 1.11 — Boat / yacht-club / race-committee model clarity

**Duration:** ~1 day
**Build system:** **Expo Go** — pure-JS, ships via EAS Update.
**Why this exists:** project-owner feedback on the Invite-crew screen
flagged the real problem: we had been collapsing three distinct
real-world entities into a single "committee identity". The
cryptography is right (one keypair on the phone signs everything you
share), but the language + information architecture mashed concepts
that sailors keep separate in their heads.

## Real-world model

| Entity | Example | What it has |
|---|---|---|
| Your **yacht** | Pantera | Crew + marks library + polar |
| A **yacht club** | SCYC (Abersoch / South Caernarvonshire) | Member yachts + the race committee that runs its races |
| A **race committee** | The race officer at SCYC for Wednesday's race | Signing keypair that pushes courses to the fleet |

Three relationships:
- Pantera is a **member of** SCYC (and maybe Pwllheli SC, Holyhead SC,
  whoever else they race with).
- SCYC's race committee **pushes courses** to its racing yachts.
- Pantera's crew **share** race state among themselves once the
  course arrives.

Phase 1.11 doesn't change the wire format or the cryptography. It
restructures the user-facing labels + Settings hierarchy so each
thing has its own home and the relationships are obvious.

## In scope

### 1.11.1 — Persistent boat name in settings

Today the boat name is a free-text field on `ShareBoatProfileScreen`,
re-entered every share. That's wrong — your boat's name is a stable
property, not a per-share thing.

- Add `boatName: string | null` to `useSettingsStore`. Persisted.
- Add `setBoatName(name: string | null)` action.
- `ShareBoatProfileScreen` reads from + writes back to settings —
  edit-in-place updates the persistent name.
- Default is null; empty-state on screens prompts the user to set it.

### 1.11.2 — Settings information architecture

Important refinement after first review: a sailor isn't always a
captain. James captains Pantera but also sails as crew on his dad's
boat and a friend's J/24. So Settings has to acknowledge both
modes — the "Me" identity, the "My boat" ownership, and the wider
trust list of clubs + captains.

Restructure into three sections:

```
Settings
├─ Me                              ← personal, always relevant
│   ├─ My signing identity         (one keypair signs everything)
│   ├─ My sailing log              (lifetime miles + boats I've joined)
│   ├─ Display (theme, units)
│   └─ Wind direction / speed
│
├─ My boat (Pantera)               ← captain mode
│   ├─ Boat name
│   ├─ Marks library
│   ├─ Polar table
│   ├─ Saved courses
│   ├─ Race history
│   ├─ Invite crew (Join boat)
│   └─ Share with crew (live race)
│
└─ Yacht clubs & trusted people    ← race committees + captains who invite me
    ├─ Trusted clubs + people
    └─ Scan QR
```

The "boats I've joined" list lives inside **My sailing log** (already
shipped Phase 1.10). That's the "me as crew" view — every boat I've
ever scanned a profile QR for shows up there with join date + marks
added. Settings doesn't duplicate it.

When the sailor scans someone else's boat profile, marks merge into
their personal library. Phase 1.11 doesn't segregate by boat —
"switch to dad's boat marks" is Phase 4.5+ work (needs a per-boat
mark scope concept).

### 1.11.3 — "Trusted committees" → "Yacht clubs"

The current `TrustedCommitteesScreen` is functionally a list of
trusted signing identities. In the new model:

- It splits conceptually into **trusted yacht clubs** (whose race
  committees can push courses) and **trusted people** (captains who
  can invite you to their boats).
- For Phase 1.11, the underlying trust list is unchanged — every
  trusted entity is still a `CommitteeTrust` row. The split is
  visual: one section per "role" inferred from heuristics or
  explicit label.
- Keeping it simple for v1: rename to **"Trusted clubs + people"**
  and let the user understand the list contains both. A label
  field on each entry comes in Phase 4.5+ when we differentiate
  signing-identity types properly.

### 1.11.4 — Copy clean-up

Across screens, replace remaining "committee" leakage where the
context is actually a yacht club or a person:

- "Scan a committee QR" → "**Scan QR**" (already partly done in
  Phase 1.10; finish the audit).
- "Trust this committee?" already became "Trust ${name}?" — keep.
- ScanCoursePushScreen mid-flow copy: when a course bundle arrives,
  the success message should say "Got course from ${committeeName}'s
  race committee" rather than "Got course from ${committeeName}".
  Subtle — `committeeName` is still the user-set display name (e.g.
  "SCYC") so the sentence reads naturally.

## Out of scope for Phase 1.11

- **Multiple boats per device** ("I race on Pantera and a friend's
  J/24") — Phase 4.5+ when boat becomes a first-class entity.
- **Yacht-club fleet membership tracking** ("Pantera is a member of
  SCYC") — needs server-side. Today the relationship is implicit:
  you trust SCYC, you accept their courses.
- **Different keypairs for different roles** — keep one keypair per
  device. The role is inferred from what's being shared, not from
  who's signing.
- **Crew identities + roles** (helm / tactician / navigator) — Phase
  4.5+.
- **Joining vs leaving a yacht club** as a workflow — Phase 4.5+.

## Phase 1.11 exit gate

- [ ] Settings opens to four clear sections: My boat, Crew & sharing,
      Yacht clubs, Display.
- [ ] Boat name persists. ShareBoatProfileScreen shows the persistent
      name, can edit it, and writes back.
- [ ] "Trusted committees" link becomes "Trusted clubs + people".
- [ ] Project-owner feedback test: "I get what each section is for
      without having to think."
- [ ] `npm run audit` clean.
- [ ] EAS Update bundle published.

---

## Retro — 2026-04-25 (after-Phase-1.10 polish session)

Plan refined twice during the session: first to acknowledge that a
sailor isn't always a captain (he's also crew on others' boats), then
to make "Join boat" reachable from anywhere on the boat.

**Shipped:**

- ✅ Persistent `boatName` in `useSettingsStore` — set once, used
  everywhere. ShareBoatProfileScreen reads from + writes to
  settings (no more per-share input). Empty state prompts the
  sailor to set it on Settings.
- ✅ Settings IA reorganised into three sections matching the
  real-world model:
  - **Me** — signing identity, sailing log, theme + units, wind.
  - **My boat — Pantera** (header reflects the persistent name) —
    boat name, mark library, polar, saved courses, race history,
    invite crew.
  - **Yacht clubs & trusted people** — Scan QR (Join boat / accept
    course / trust captain), Trusted clubs + people.
- ✅ New `BoatNameRow` component on Settings — edits in place, blurs
  to commit.
- ✅ Sailing Log gains a prominent **"+ Join a boat"** action at
  the top of the Boats card. Tap → camera scanner.
- ✅ HomeScreen gains a single-line "⌧ Scan QR — join a boat /
  accept a course" link below the primary CTA. Only shows in
  cruise mode (when no race is armed) so it doesn't compete with
  the timer's "Open timer" button.
- ✅ Drafted `docs/dad-how-to-join-pantera.md` — a one-page guide
  the project owner can text his dad covering install Expo Go →
  open URL → trust James → Join Pantera → race-share each week.

**Unchanged (deliberately):**

- The keypair / wire format / trust list. The cryptography is
  correct as-is; this phase was about labelling. Internal
  identifiers like `committeeId`, `committeeName`,
  `useCommitteeIdentityStore` stay called those — code-level
  names, no user-visible benefit to renaming.

**What this enables:**

- Dad downloads the app → trusts James → joins Pantera. Marks +
  polar populate his iPhone. He's crew.
- Each Wednesday-night start, James shares the race; dad scans;
  both timers count to the same gun.
- Both phones build up their own sailing log — dad sees Pantera
  in his "Boats joined" list with the join date + marks added.

**Phase placement next:**
Phase 2 (charts) is still gated on Apple Developer Program £79.
Phase 1.8 (dashboard catalogue) is paused with plan committed.
Other Phase 1.x candidates that don't need either: per-leg timer,
voice race-officer guidance (audio cues), wind shift trend graph,
crew chat (probably never), boat-leaderboard share.
