# Layout shell

Target structure:

```
┌──────────┬───────────────────────────────────────┐
│ Brand    │ Topbar: page title · filters · actions │  sticky, --topbar-h
│──────────│───────────────────────────────────────│
│ Nav item │                                       │
│ Nav item │  <router-view />                      │  scrolls; max-width
│ Nav item │  padded by --page-pad                 │  --content-max
│          │                                       │
│──────────│                                       │
│ Footer:  │                                       │
│ profile, │                                       │
│ language │                                       │
└──────────┴───────────────────────────────────────┘
 sticky, full height
```

## Root

```vue
<div class="app-shell" :class="{ 'is-collapsed': collapsed, 'is-drawer-open': drawerOpen }">
  <AppSidebar :collapsed="collapsed" @toggle-collapse="toggleCollapsed" @navigate="drawerOpen = false" />
  <div v-if="drawerOpen" class="sidebar-overlay" @click="drawerOpen = false" />
  <div class="app-main">
    <AppTopbar @open-drawer="drawerOpen = true" />   <!-- global filters/actions live here -->
    <main class="app-content"><router-view /></main>
  </div>
  <!-- modals stay at root level, wired exactly as before -->
</div>
```

```css
.app-shell {
  display: grid;
  grid-template-columns: var(--sidebar-w) minmax(0, 1fr);
  min-height: 100vh;
  background: var(--color-bg);
  transition: grid-template-columns var(--transition);
}
.app-shell.is-collapsed { grid-template-columns: var(--sidebar-w-collapsed) minmax(0, 1fr); }
.app-main { display: flex; flex-direction: column; min-width: 0; }
.app-content {
  width: 100%;
  max-width: var(--content-max);
  margin: 0 auto;
  padding: var(--page-pad);
}
```
`minmax(0, 1fr)` and `min-width: 0` keep wide tables from forcing horizontal page scroll; tables scroll inside `.table-container` instead.

## AppSidebar.vue

- **Items from one array** in the component's setup, e.g. `{ to: '/inventory', labelKey: 'nav.inventory', icon: 'box' }`. Literal labels keep their literal; route paths and i18n keys copied verbatim from the old nav.
- **Icons**: inline SVG, 20px, `stroke="currentColor"`, `aria-hidden="true"`, held in a small `icons` map in the same file. Stroke icons in the Lucide/Heroicons-outline style fit; draw simple ones (grid, box, cart, wallet, trending-up, file-text, chevrons) rather than adding a package.
- **Active state**: use `router-link`'s `active-class`/`exact-active-class`. The root route `/` needs exact matching, or it shows active on every page.
- **Structure**: `<aside class="sidebar">` → brand block (logo mark + app name; subtitle hidden when collapsed) → `<nav aria-label="Main">` list → spacer → footer (profile, language, collapse toggle).
- **Collapsed rail**: labels visually hidden (keep them for screen readers), icons centered, `title` attribute with the label as a tooltip.
- **Collapse persistence**: store in `localStorage` wrapped in try/catch; default to expanded when storage is unavailable.

```css
.sidebar {
  position: sticky; top: 0; height: 100vh;
  display: flex; flex-direction: column;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  padding: var(--space-4) var(--space-3);
  z-index: var(--z-sidebar);
  overflow-y: auto;
}
.nav-item {
  display: flex; align-items: center; gap: var(--space-3);
  height: 40px; padding: 0 var(--space-3);
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  font-size: var(--text-sm); font-weight: var(--weight-medium);
  text-decoration: none;
  transition: background var(--transition), color var(--transition);
}
.nav-item:hover { background: var(--color-surface-muted); color: var(--color-text); }
.nav-item.is-active { background: var(--color-accent-soft); color: var(--color-accent); }
.nav-item:focus-visible { outline: 2px solid var(--color-focus); outline-offset: 2px; }
```

## AppTopbar.vue

Sticky inside `.app-main`: `position: sticky; top: 0; min-height: var(--topbar-h); z-index: var(--z-topbar)`, surface background, bottom border.

- **≥ 768px**: the topbar holds the global filters (left) and actions (right), one sticky bar; filters may wrap to a second line inside it. It shows no page title when views render their own `.page-header` title, since a topbar title directly above the same heading reads as a duplicate.
- **< 768px**: hamburger (`aria-label`, `aria-expanded`) + current page title (looked up from the nav array by route) stay sticky; filters move out of the sticky bar and scroll with the page, so they don't eat the small viewport.

## Relocating header widgets

- **Profile menu / account** → sidebar footer (common SaaS pattern) or topbar right. Keep its props and every emitted event bound exactly as before.
- **Language / theme switcher** → sidebar footer or topbar right.
- **Global filters** → topbar or the filter row below it.
- **Geometry fixes** for each item on the preservation list:
  - Sticky offsets that assumed the old header height (`top: 70px`) → `top: 0` or `top: var(--topbar-h)`.
  - Dropdowns that open downward with `top: calc(100% + …)` → in the sidebar footer, open upward (`bottom: calc(100% + var(--space-2)); top: auto`) and align to the sidebar's inner edge; in the collapsed rail, open to the right (`left: calc(100% + var(--space-2))`).
  - Old header `z-index` values → the `--z-*` layer tokens, so dropdowns sit above the topbar and modals above everything.

## Responsive

| Width | Sidebar |
|---|---|
| ≥ 1024px | Expanded by default; user can collapse to rail |
| 768–1023px | Rail (collapsed) by default |
| < 768px | Off-canvas drawer: `position: fixed`, slides in from left over an overlay (`--z-overlay`); grid becomes one column |

Drawer behaviour: hamburger opens it; overlay click, Esc, and choosing a nav item close it; focus moves into the drawer on open and back to the hamburger on close; body scroll locks while open. `--page-pad` drops to `--space-4` below 768px.
