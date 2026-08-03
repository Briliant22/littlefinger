# Design System

Clean, modern finance tracker built on a white-and-emerald palette. Every surface is intentional, every interaction feels live. Data clarity is the north star — numbers are scannable, actions are obvious, and the interface stays out of the way.

---

## Stack

- **Framework:** Next.js App Router + React + TypeScript
- **Styling:** Tailwind CSS v4 via `@theme inline` in `app/globals.css`
- **Components:** shadcn-style primitives in `components/ui`
- **Icons:** Lucide React
- **Fonts:** Inter for UI and headings, JetBrains Mono for financial data
- **Dark mode:** `next-themes`, class-based, light default with system preference
- **Utilities:** `cn()` from `@/lib/utils`

---

## Visual Direction

The app is a personal finance command center, not a dashboard template.

- **Light theme:** white background, emerald accents, generous whitespace. Cards float on subtle shadows. Borders are hairline thin.
- **Dark theme:** deep charcoal canvas, brighter emerald glow. Same spatial rhythm as light, inverted luminance.
- Data takes center stage: numbers in mono, labels clean and minimal, charts uncluttered.
- No decorative textures, no glass effects, no blueprint grids — every pixel earns its place.
- Surfaces use layers of white and gray (light) or charcoal and slate (dark) for spatial hierarchy, not translucency.

---

## Tokens

All semantic tokens live in `app/globals.css` and are bridged to Tailwind with `@theme inline`.

### Light (default)

| Token | Value | Usage |
|---|---|---|
| `background` | `oklch(0.985 0.002 80)` | Page canvas |
| `foreground` | `oklch(0.13 0.015 255)` | Primary text |
| `card` | `oklch(0.995 0.001 80)` | Card and panel surfaces |
| `card-foreground` | `oklch(0.13 0.015 255)` | Text on cards |
| `popover` | `oklch(0.995 0.001 80)` | Dropdowns, dialogs |
| `popover-foreground` | `oklch(0.13 0.015 255)` | Text on popovers |
| `primary` | `oklch(0.58 0.17 162)` | Emerald — buttons, links, active states |
| `primary-foreground` | `oklch(0.985 0.002 80)` | Text on primary |
| `secondary` | `oklch(0.93 0.005 80)` | Subtle secondary surfaces |
| `secondary-foreground` | `oklch(0.13 0.015 255)` | Text on secondary |
| `muted` | `oklch(0.95 0.003 80)` | Very subtle background tint |
| `muted-foreground` | `oklch(0.48 0.01 255)` | Supporting copy |
| `accent` | `oklch(0.52 0.14 220)` | Blue complement for secondary actions |
| `accent-foreground` | `oklch(0.985 0.002 80)` | Text on accent |
| `destructive` | `oklch(0.58 0.2 30)` | Delete, errors, negative changes |
| `destructive-foreground` | `oklch(0.985 0.002 80)` | Text on destructive |
| `border` | `oklch(0.88 0.005 80)` | Hairline borders and dividers |
| `input` | `oklch(0.88 0.005 80)` | Input field borders |
| `ring` | `oklch(0.58 0.17 162)` | Focus rings (matches primary) |

### Dark

| Token | Value | Usage |
|---|---|---|
| `background` | `oklch(0.12 0.015 260)` | Deep charcoal canvas |
| `foreground` | `oklch(0.95 0.003 80)` | Primary text |
| `card` | `oklch(0.16 0.015 260)` | Card surfaces |
| `card-foreground` | `oklch(0.95 0.003 80)` | Text on cards |
| `popover` | `oklch(0.16 0.015 260)` | Dropdowns, dialogs |
| `popover-foreground` | `oklch(0.95 0.003 80)` | Text on popovers |
| `primary` | `oklch(0.62 0.17 162)` | Brighter emerald for dark bg |
| `primary-foreground` | `oklch(0.12 0.015 260)` | Text on primary |
| `secondary` | `oklch(0.2 0.01 260)` | Secondary dark surfaces |
| `secondary-foreground` | `oklch(0.95 0.003 80)` | Text on secondary |
| `muted` | `oklch(0.18 0.008 260)` | Subtle dark tint |
| `muted-foreground` | `oklch(0.6 0.008 260)` | Supporting copy |
| `accent` | `oklch(0.56 0.14 220)` | Blue complement for dark |
| `accent-foreground` | `oklch(0.95 0.003 80)` | Text on accent |
| `destructive` | `oklch(0.62 0.2 30)` | Delete, errors for dark |
| `destructive-foreground` | `oklch(0.95 0.003 80)` | Text on destructive |
| `border` | `oklch(0.22 0.01 260)` | Dark borders |
| `input` | `oklch(0.22 0.01 260)` | Dark input borders |
| `ring` | `oklch(0.62 0.17 162)` | Focus rings |

### Chart colors (finance-aligned)

| Token | Light | Dark | Meaning |
|---|---|---|---|
| `chart-1` | `oklch(0.58 0.17 162)` | `oklch(0.64 0.17 162)` | Emerald — gains, positive |
| `chart-2` | `oklch(0.58 0.2 30)` | `oklch(0.64 0.2 30)` | Red — losses, negative |
| `chart-3` | `oklch(0.52 0.14 220)` | `oklch(0.58 0.14 220)` | Blue — neutral / other |
| `chart-4` | `oklch(0.68 0.12 75)` | `oklch(0.74 0.12 75)` | Amber — income sources |
| `chart-5` | `oklch(0.62 0.15 290)` | `oklch(0.66 0.15 290)` | Violet — categorization |

### Sidebar tokens

Sidebar inherits from card palette with matching primary/accent/border — see `globals.css`.

---

## Typography

| Token | Font | Usage |
|---|---|---|
| `--font-body` | Inter (variable 400–700) | UI text, headings, body, controls, labels |
| `--font-mono` | JetBrains Mono (400, 500, 700) | Currency amounts, balances, tables, data points |

Inter serves double duty as both body and display font — its wide weight range eliminates the need for a separate display face. JetBrains Mono is reserved strictly for financial data where tabular alignment and character clarity matter.

### Type scale

- **Hero numbers** (large balances): `text-6xl` to `text-8xl`, `font-mono`, `tracking-tight`
- **Page titles**: `text-3xl` to `text-4xl`, `font-body`, `font-semibold`
- **Section titles**: `text-xl` to `text-2xl`, `font-body`, `font-semibold`
- **Card titles**: `text-lg`, `font-body`, `font-semibold`
- **Body copy**: `text-sm` to `text-base`, `font-body`, `leading-6` to `leading-7`
- **Data (tables, lists)**: `text-sm`, `font-mono` for numeric columns
- **Labels and captions**: `text-xs` to `text-sm`, `font-body`, `font-medium`
- **Small print / metadata**: `text-xs`, `font-body`

### Guidelines

- No uppercase styling — use sentence case throughout.
- Mono text uses tabular figures (`font-variant-numeric: tabular-nums`) for number alignment.
- Avoid all-caps labels: clean, readable sentence-case labels are preferred for everything.
- Keep line length in body text between 60–75 characters for comfortable reading.

---

## Core Utilities

Defined in `app/globals.css`:

- **`.page-surface`**: clean background for the canvas — applies subtle radial gradient of primary at very low opacity for a hint of warmth without distraction.
- **`.card-surface`**: white rounded panel with subtle shadow — the primary surface for cards, sections, and panels.
- **`.data-card`**: card with mono-aligned number styling — used for financial summary cards, balance displays, and stat blocks.
- **`.chart-surface`**: clean container for chart components — minimal border, white background, no grid textures.
- **`.accent-strip`**: emerald-to-blue gradient strip — used sparingly for emphasis on key actions or highlights.
- **`.data-label`**: clean label style — Inter Medium, `text-xs`, sentence case, `text-muted-foreground`.

---

## Components

### Cards

Cards are white, rounded (`rounded-xl`), and clean. They use subtle shadow for depth.

```tsx
<Card className="overflow-hidden">
```

Use layers of white (`bg-card`) on muted (`bg-muted`) backgrounds for spatial hierarchy. Avoid transparency and glass effects. Financial data cards should use `data-card` for mono number alignment.

### Buttons

Primary buttons are emerald filled with white text, `rounded-xl`, with clear hover (brighten) and press (`scale-[0.97]`) states. Outline buttons use a border that fills with emerald on hover. Secondary buttons are white with a light border.

### Inputs

Inputs and textareas use `rounded-lg`, subtle border (`border-input`), and an emerald focus ring. They should feel clean and embedded — no inner shadows or translucency.

### Badges

Badges are clean colored pills in sentence case. Use them for category labels, status indicators, and filter tags. Inter Medium, `text-xs`.

### Charts

Chart containers use `.chart-surface`. Lines and bars follow the chart color tokens (emerald for gains, red for losses, etc.). Keep grid lines minimal and light. Tooltips are white cards with clean data formatting.

### Data Tables

Prefer card-based row layouts over traditional tables for most views. Each row is a subtle card with alternating `bg-card` and `bg-muted/50` backgrounds. Numeric values are right-aligned in JetBrains Mono with tabular figures.

---

## Layout

Use a clean centered layout with generous whitespace:

```tsx
<main className="page-surface min-h-screen flex-1 overflow-hidden">
  <div className="container mx-auto max-w-screen-xl px-6 py-8 lg:py-12">
```

Pages use a single-column or simple sidebar layout. The sticky command rail from the previous design is removed — navigation is handled via a top header or persistent sidebar.

Mobile: single-column stacked layout with no sticky elements.

---

## Mobile First

This application is a mobile-first experience. Every design decision must be usable and polished on mobile before desktop enhancements are layered on.

- **Mobile-first responsive**: Default styles target mobile widths. Desktop layouts are progressive enhancements via Tailwind breakpoints (`sm`, `md`, `lg`, `xl`).
- **Different layouts per breakpoint**: Mobile and desktop can use distinct layouts — not just scaling, but different component arrangements. For example, the **expenses list** shows a single stacked view with a tab switcher on mobile, and a two-column sidebar layout on desktop.
- **Touch-friendly**: All interactive elements must meet minimum touch target sizes (44×44px) and be reachable within a thumb-friendly zone.
- **No horizontal scroll**: Content must never overflow horizontally at any viewport width.
- **Verify both**: Every UI change should be checked on a mobile viewport (~375px) and a desktop viewport (~1280px+).

When in doubt, optimize for the smallest screen — desktop will naturally follow.

---

## Interaction

Components should feel reactive and alive.

- **Transitions**: 200–250ms ease on all interactive properties (color, shadow, transform).
- **Hover**: cards lift `-translate-y-1` with shadow deepening. Buttons shift tint. Clickable rows highlight.
- **Focus**: emerald ring (`focus-visible:ring-primary/50 focus-visible:ring-[3px]`).
- **Press**: tactile scale-down (`active:scale-[0.97]`) on buttons and clickable cards.
- **Entrance**: `animate-fade-up` for page content. Card lists stagger with 50ms delay per item (`animate-fade-up [&:nth-child(n)]:delay-[calc(n*50ms)]`).
- **Loading**: skeleton loaders with shimmer animation for data sections, tables, and charts.
- **Empty states**: centered illustration with action prompt — guide the user to add their first item.

Keep motion purposeful and fast. Avoid decorative loops or animations that delay the user.

---

## Accessibility

- Preserve visible focus rings on all interactive controls.
- Maintain high text contrast on all surfaces (minimum WCAG AA).
- Provide text representations for chart data.
- All controls must be usable on mobile, especially add/remove/edit actions.
- Reduced motion: respect `prefers-reduced-motion` by disabling decorative animations.
