# OpenRacer design system

Read this before any UI work. Every screen, component, and visual decision in OpenRacer should follow these rules.

## When to use this skill

- Creating any new screen or component
- Modifying existing UI
- Adding any visible element
- Choosing colours, fonts, sizes, spacing
- Deciding what's emphasised vs subdued

## Core principles

### 1. Glanceable, not readable
A sailor looks at the app for under 2 seconds at a time. On deck, in sunlight, with spray on the screen. Every UI decision must answer: "can this be read at a glance?"

**Consequence:** Big numbers are big. Labels are small. Information hierarchy is ruthless.

### 2. Information density is earned, not given
Empty space is not wasted space. It's the frame that makes the critical number readable. Resist the temptation to fill screens.

**Consequence:** 4-6 primary data points per screen max. Secondary info collapses.

### 3. Legibility first, aesthetics second
If it's beautiful but hard to read on a wet phone at 2m in bright sun, it's broken.

**Consequence:** High contrast. Sans-serif. Weight > decoration. Never light grey on white for anything functional.

### 4. Colour means something
Every colour in the palette has a meaning. Don't use purple "because it looks nice." Use purple because the component is in **constant-connection / enhanced** mode.

### 5. Dyslexia-friendly
Project owner is dyslexic. Visual patterns matter.

**Consequence:** Clean sans-serif font. Generous line height. Short text blocks. Consistent vertical rhythm. Icons reinforce (not replace) text labels.

## Design tokens

These are the only values allowed. Anything else is a bug.

### Colours

```typescript
// src/theme/tokens.ts
export const colours = {
  // Brand
  brand: {
    primary: '#1F4E79',     // OpenRacer blue — title, primary actions
    primaryDim: '#2B5F8B',  // Hovered / pressed state
  },

  // Status — used for connectivity mode and similar
  status: {
    offline: '#595959',     // Grey. Neutral, not alarming.
    patchy: '#854F0B',      // Amber. "Working with limitations".
    constant: '#534AB7',    // Purple. Enhanced mode. Special.
    success: '#3B6D11',     // Green. Positive confirmation.
    warning: '#A8450B',     // Orange. Attention needed.
    danger: '#B91C1C',      // Red. MOB, alarms, critical.
  },

  // Neutrals
  neutral: {
    bg: '#FFFFFF',          // Day mode background
    bgNight: '#0B0D10',     // Night mode background (near-black)
    surface: '#F8F9FB',     // Card/panel background, day
    surfaceNight: '#15181D',
    border: '#E4E7EC',
    borderNight: '#2A2E34',
    textPrimary: '#0F172A', // Near-black, maximum contrast
    textPrimaryNight: '#F1F5F9',
    textSecondary: '#475569',
    textSecondaryNight: '#94A3B8',
    textMuted: '#94A3B8',
    textMutedNight: '#64748B',
  },

  // Night mode red (preserve night vision)
  night: {
    accent: '#DC2626',      // Red for night mode UI
    accentDim: '#991B1B',
  },
};
```

### Typography

Single font family: **Inter** (fallback: system sans). Weights: 400 (regular), 600 (semibold), 700 (bold).

```typescript
export const type = {
  // Monster numbers for primary data (SOG, TWS, etc.)
  monster: { size: 96, weight: '700', lineHeight: 1.0, letterSpacing: -2 },
  huge:    { size: 64, weight: '700', lineHeight: 1.0, letterSpacing: -1 },

  // Large numbers for secondary data
  xlarge:  { size: 42, weight: '600', lineHeight: 1.1, letterSpacing: -0.5 },
  large:   { size: 32, weight: '600', lineHeight: 1.2 },

  // Headings
  h1:      { size: 28, weight: '700', lineHeight: 1.2 },
  h2:      { size: 22, weight: '600', lineHeight: 1.3 },
  h3:      { size: 18, weight: '600', lineHeight: 1.3 },

  // Body
  body:    { size: 16, weight: '400', lineHeight: 1.5 },
  bodySemi:{ size: 16, weight: '600', lineHeight: 1.5 },

  // Labels, captions, meta
  label:   { size: 13, weight: '600', lineHeight: 1.3, letterSpacing: 0.5 }, // UPPERCASE
  caption: { size: 12, weight: '400', lineHeight: 1.4 },
  micro:   { size: 10, weight: '600', lineHeight: 1.2, letterSpacing: 0.5 }, // UPPERCASE
};
```

**Rules:**
- Monster/Huge: reserved for the 1-2 most critical numbers on screen (SOG, countdown)
- XLarge/Large: secondary data numbers (depth, wind angle)
- Label: small uppercase text above a number (e.g., "SOG" above the value)
- Caption: timestamps, accuracy, freshness badges

### Spacing

8px grid. Use these only.

```typescript
export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,   // default gap
  lg: 24,
  xl: 32,
  xxl: 48,
  huge: 64,
};
```

### Radii

```typescript
export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  full: 9999,
};
```

### Elevation (shadows)

Minimal. Marine environments don't need Material Design depth.

```typescript
export const elevation = {
  none: 'none',
  card: '0 1px 2px rgba(15,23,42,0.08)',
  modal: '0 8px 24px rgba(15,23,42,0.16)',
};
```

### Transitions

Avoid animation in primary data. Numbers should snap to new values — a sailor glancing sees the current value, not an interpolation.

Acceptable animations:
- Mode switches (300ms ease)
- Screen transitions (250ms)
- Non-critical UI entry/exit (200ms)

Never animate: SOG, COG, depth, wind angle, time-to-line, countdown.

## Component patterns

### `BigNumber`

The fundamental primitive. A large glanceable value with a label underneath.

```
┌─────────────────┐
│  SOG            │  ← label (uppercase, small, muted)
│                 │
│    6.2          │  ← value (monster size, primary colour)
│                 │
│  kn             │  ← unit (small, muted)
└─────────────────┘
```

Props:
- `value: string | number`
- `label: string` — always uppercase rendered
- `unit?: string` — lowercase "kn", "°", "m", "nm"
- `emphasis?: 'primary' | 'secondary' | 'muted'`
- `stale?: boolean` — if true, value is dimmed 40% to indicate it's not live

**Two BigNumbers per row max.** Three is too many for glance-reading.

### `ConnectionBadge`

Small pill-shaped indicator showing connectivity mode.

```
●  Offline         ●  Patchy         ●  Starlink
(grey)             (amber)           (purple)
```

- Always in the top-left of the screen
- Small enough to ignore when not relevant
- Tappable for detail (shows "last synced 2 min ago", etc.)
- Non-alarming — "offline" is the default racing state, shouldn't feel broken

### `ModeToggle`

Race / Cruise toggle. Top-right.

```
┌───────────────┐
│ Race | Cruise │   (the selected one is bold + underlined)
└───────────────┘
```

- Manual tap switches modes
- Auto-switches to Race when timer arms
- Long-press for quick toggle
- Modes are BOTH first-class — never treat Race as "default" and Cruise as "other"

### `NudgeCard`

Tactical alert or suggestion. Transient.

```
┌──────────────────────────────────────┐
│ ● GUST WITH HEADER                   │  ← status dot + label
│                                      │
│ 12% AWS spike, AWA shifted 15° right │  ← explanation
│                                      │
│ Tack to capture the lift             │  ← action suggested
│                                      │
│              [Tack] [Dismiss]        │  ← actions
└──────────────────────────────────────┘
```

- Appears bottom of screen, slides up
- Auto-dismisses after 10s if no interaction (for non-critical nudges)
- Critical nudges (MOB, danger) require explicit dismissal
- Max one nudge at a time — new one replaces old

### `MarkCard`

For mark library screen. Shows one mark.

```
┌──────────────────────────────────────────┐
│  [icon]  Green Buoy                      │  ← icon + name
│                                          │
│  52° 49.230'N · 004° 30.150'W            │  ← coords
│                                          │
│  [CLUB SEASONAL]  Last used 2 days ago   │  ← tier badge + meta
└──────────────────────────────────────────┘
```

- Whole card is tappable
- Tier badge colour matches tier:
  - Club seasonal: brand.primary
  - Chart permanent: status.success
  - Race-day recent: status.warning
  - Single-race: status.offline (grey, temporary)

### `Callout`

Info/warning box for explanatory text. Left border thicker for colour hint.

```
┃ Offline-first racing
┃
┃ Your position updates via GPS satellites,
┃ which work anywhere. No cell signal needed.
```

Variants: info (blue), warning (amber), success (green), danger (red).

## Screen patterns

### Primary data screen (HomeScreen, RaceScreen)

```
┌───────────────────────────────────────────┐
│ ● Offline                      Race|Cruise│  ← top bar: status + mode
│                                           │
│                                           │
│   SOG                  COG                │
│                                           │
│    6.2                  284               │  ← two monster numbers
│                                           │
│   kn                   °                  │
│                                           │
│   LAT                  LON                │
│                                           │
│    52.8205              -4.5025           │  ← two large numbers
│                                           │
│                                           │
│ GPS ±3m · updated 1s ago                  │  ← bottom meta line
└───────────────────────────────────────────┘
```

Rules:
- Status bar always at top, 44px height
- Primary data in grid of BigNumbers — 1-4 of them
- No nav drawer / hamburger — main screens are flat
- Meta info (accuracy, freshness) at bottom, small

### List screen (MarkLibraryScreen, SessionHistoryScreen)

```
┌───────────────────────────────────────────┐
│ ← Back      Mark Library        [+ Add]  │
│                                           │
│ [🔍 Search marks...]                      │
│                                           │
│ [Seasonal] [Permanent] [Recent] [All]     │  ← tier tabs
│                                           │
│ ┌──────────────────────────────────────┐ │
│ │  MarkCard                             │ │
│ └──────────────────────────────────────┘ │
│                                           │
│ ┌──────────────────────────────────────┐ │
│ │  MarkCard                             │ │
│ └──────────────────────────────────────┘ │
│                                           │
└───────────────────────────────────────────┘
```

Rules:
- Back arrow + title + primary action at top
- Search/filter row below
- Cards as list items, full-width minus padding
- Swipe-to-delete on appropriate lists (sessions, temp marks)

## Night mode

When `nightMode: true`:
- Background switches to `neutral.bgNight`
- Text uses night variants
- Accent colour shifts to `night.accent` (red) for critical elements
- Status colours dim 30%
- No white backgrounds anywhere

Auto-enable at local sunset (via geo + date). User override persistent.

## Accessibility

- Minimum tap target: 44x44 pt (Apple HIG)
- Minimum text contrast: 7:1 for primary data (WCAG AAA)
- All interactive elements have `accessibilityLabel`
- Critical alerts trigger haptic feedback
- Audio nudges available for screen-off use

## What NOT to do

- Don't use decorative colours. Every colour communicates state.
- Don't use more than 2 type weights in a single view.
- Don't use drop shadows as decoration — only to separate foreground from background.
- Don't animate primary data values.
- Don't use light grey text on white anywhere functional.
- Don't nest cards inside cards.
- Don't use modal dialogs for anything that doesn't absolutely require interrupting the sailor.
- Don't hide primary actions behind menus.
- Don't show loading spinners for things that should be instant (local data is instant).

## References

- `skills/design-system/mockups/mark-library.html` — reference mockup for the tiered mark library screen. Open in a browser to see the design rendered.

## When in doubt

Ask: "would a sailor understand this at a glance, in the rain, with cold hands?" If the answer isn't a clear yes, simplify.
