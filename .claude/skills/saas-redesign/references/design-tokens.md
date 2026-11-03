# Design tokens

One `:root` block in the global stylesheet. Components read tokens; they never hold raw values. Seed the colors from the project's existing palette (keep its brand/accent and status hues), and adjust values to taste, keeping the token names.

```css
:root {
  /* Spacing: 4px base. Use only these steps. */
  --space-1: 0.25rem;  /* 4  */
  --space-2: 0.5rem;   /* 8  */
  --space-3: 0.75rem;  /* 12 */
  --space-4: 1rem;     /* 16 */
  --space-5: 1.25rem;  /* 20 */
  --space-6: 1.5rem;   /* 24 */
  --space-8: 2rem;     /* 32 */
  --space-10: 2.5rem;  /* 40 */
  --space-12: 3rem;    /* 48 */

  /* Type */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --text-xs: 0.75rem;    /* 12: table headers, badges, captions */
  --text-sm: 0.875rem;   /* 14: body in dense UI, nav items, table cells */
  --text-base: 1rem;     /* 16 */
  --text-lg: 1.125rem;   /* 18: card titles */
  --text-xl: 1.5rem;     /* 24: page titles */
  --text-2xl: 1.875rem;  /* 30: stat values */
  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --weight-medium: 500;
  --weight-semibold: 600;
  --weight-bold: 700;

  /* Neutrals (slate) */
  --color-bg: #f8fafc;            /* app canvas */
  --color-surface: #ffffff;       /* cards, sidebar, topbar */
  --color-surface-muted: #f1f5f9; /* hover fills, table head */
  --color-border: #e2e8f0;
  --color-border-strong: #cbd5e1;
  --color-text: #0f172a;
  --color-text-secondary: #475569;
  --color-text-muted: #64748b;

  /* Accent */
  --color-accent: #2563eb;
  --color-accent-hover: #1d4ed8;
  --color-accent-soft: #eff6ff;   /* active nav fill, selected rows */
  --color-focus: #3b82f6;

  /* Status: text on soft background */
  --color-success: #047857;  --color-success-soft: #ecfdf5;
  --color-warning: #b45309;  --color-warning-soft: #fffbeb;
  --color-danger:  #b91c1c;  --color-danger-soft:  #fef2f2;
  --color-info:    #1d4ed8;  --color-info-soft:    #eff6ff;

  /* Shape and depth */
  --radius-sm: 6px;   /* badges, inputs, nav items */
  --radius-md: 8px;   /* buttons, dropdowns */
  --radius-lg: 12px;  /* cards, modals */
  --shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.05);
  --shadow-md: 0 4px 12px rgba(15, 23, 42, 0.08);
  --shadow-lg: 0 12px 32px rgba(15, 23, 42, 0.12); /* modals, popovers */

  /* Layout */
  --sidebar-w: 248px;
  --sidebar-w-collapsed: 72px;
  --topbar-h: 64px;
  --content-max: 1440px;
  --page-pad: var(--space-8);

  /* Motion and layers */
  --transition: 150ms ease;
  --z-topbar: 50;
  --z-sidebar: 60;
  --z-dropdown: 100;
  --z-overlay: 200;
  --z-modal: 300;
}
```

## Rules
- **Rhythm**: gaps inside a component use `--space-2`…`--space-4`; gaps between components use `--space-5`/`--space-6`; page padding is `--page-pad`. Pick the nearest step when normalizing an old value.
- **Contrast**: body text on surface ≥ 4.5:1, large text and UI borders that carry meaning ≥ 3:1. The status pairs above pass on their soft backgrounds; re-check any color you change.
- **Depth**: borders do the separating; shadows mark elevation (hover lift, dropdowns, modals). A resting card gets a border and at most `--shadow-sm`.
- **Dark mode** is out of scope unless the user asks. When asked, redefine only the color tokens under `@media (prefers-color-scheme: dark)`; nothing else changes.
