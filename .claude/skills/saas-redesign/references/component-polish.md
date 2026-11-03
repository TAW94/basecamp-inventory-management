# Component polish

Restyle the project's existing shared class names in place, so views pick up the new look without markup changes. Every value below is a token.

## Page header
Title `--text-xl` bold, `letter-spacing: -0.02em`, `--color-text`; description `--text-sm` `--color-text-muted`, `margin-top: var(--space-1)`. Page actions (buttons) sit right-aligned on the same row via flex with `gap: var(--space-3)`. `margin-bottom: var(--space-6)`.

## Stat / KPI cards
Grid `repeat(auto-fill, minmax(220px, 1fr))`, `gap: var(--space-5)`. Card: surface, 1px border, `--radius-lg`, `padding: var(--space-5)`. Label `--text-xs` semibold uppercase `letter-spacing: 0.05em` muted; value `--text-2xl` bold, `font-variant-numeric: tabular-nums`, `margin-top: var(--space-2)`. Status variants color the value with the status token, never the whole card. Hover: `--color-border-strong` + `--shadow-md`, only when the card is clickable.

## Cards
Surface, 1px border, `--radius-lg`, `--shadow-sm`, `padding: var(--space-5)`; stacked cards separated by `--space-6`. Card header: flex, space-between, `padding-bottom: var(--space-4)`, bottom border, title `--text-lg` semibold. A card wrapping a full-width table drops its side padding so the table runs edge to edge.

## Tables
- Header: `--color-surface-muted` background, `--text-xs` semibold uppercase muted, `position: sticky; top: 0` inside the scroll container.
- Cells: `padding: var(--space-3) var(--space-4)`, `--text-sm`, `--color-text-secondary`; first column `--color-text` medium.
- Numbers, currency and dates: right-aligned with `tabular-nums`.
- Rows: 1px `--color-border` separators, hover `--color-surface-muted`, `cursor: pointer` only when the row opens something.
- Wrapper `.table-container { overflow-x: auto }` so wide tables scroll inside their card.

## Badges
Inline-flex, `gap: var(--space-1)`, `padding: 2px var(--space-2)`, `--radius-sm`, `--text-xs` medium, sentence case (drop uppercase), status token text on its `-soft` background. Optional 6px leading dot in `currentColor`. Map every existing variant (e.g. `high/medium/low`, `increasing/decreasing/stable`) onto the four status pairs plus a neutral (`--color-surface-muted` / `--color-text-secondary`).

## Buttons
Height 36px, `padding: 0 var(--space-4)`, `--radius-md`, `--text-sm` medium, `gap: var(--space-2)` for icon + label.
- Primary: `--color-accent` fill, white text, hover `--color-accent-hover`.
- Secondary: surface fill, 1px `--color-border-strong`, `--color-text`; hover `--color-surface-muted`.
- Ghost: transparent, `--color-text-secondary`; hover `--color-surface-muted`.
- Danger: `--color-danger` fill.
- All: `:focus-visible` 2px `--color-focus` outline offset 2px; `:disabled` at 50% opacity, `cursor: not-allowed`.

## Inputs and selects
Height 36px, `padding: 0 var(--space-3)`, 1px `--color-border-strong`, `--radius-sm`, surface fill, `--text-sm`. Focus: border `--color-focus` + `box-shadow: 0 0 0 3px var(--color-accent-soft)`. Labels `--text-xs` semibold `--color-text-secondary`, `margin-bottom: var(--space-1)`. Filter groups in a row: flex-wrap, `gap: var(--space-4)`.

## Modals
Overlay `rgba(15, 23, 42, 0.45)` at `--z-modal`. Panel: surface, `--radius-lg`, `--shadow-lg`, `max-width` 560–720px, `max-height: calc(100vh - var(--space-12))` with body scrolling. Header and footer `padding: var(--space-5) var(--space-6)` with border separators; footer buttons right-aligned, primary last.

## Dropdowns and popovers
Surface, 1px border, `--radius-md`, `--shadow-lg`, `padding: var(--space-1)`, items 36px tall with `--radius-sm` hover fill, at `--z-dropdown`.

## States
- **Loading**: skeleton blocks (`--color-surface-muted` with a subtle shimmer) shaped like the content, or a centered muted line inside the card. Keep the existing loading condition and text keys.
- **Empty**: centered in the card, muted icon, one `--text-sm` line, optional action button.
- **Error**: `--color-danger-soft` background, 1px danger-tinted border, `--color-danger` text, `--radius-md`, `padding: var(--space-4)`.

## Charts
Keep chart logic untouched. Restyle only presentation: axis/grid lines `--color-border`, labels `--text-xs` muted, series colors from accent and status tokens, chart wrapped in a standard card.
