# Project notes: basecamp-inventory-management

Pre-answered discovery for this repo. Re-check each item against the code before relying on it: files may have changed since this was written (a feature may have added routes, nav links or header widgets).

## Rules from CLAUDE.md that bind the redesign
- `.vue` creation or significant edits go to the `vue-expert` subagent (see SKILL.md, Delegation).
- Palette: slate neutrals (#0f172a, #64748b, #e2e8f0), status green/blue/yellow/red. The default tokens already match.
- No emojis in UI. Charts are custom SVG; layouts use CSS Grid.
- Browser testing via Playwright MCP against http://localhost:3000 (API on :8001). Start both with the `/start` command.
- The repo is public: keep `client/.npmrc` and the gitignored `package-lock.json` as they are.

## Shell
- `client/src/App.vue` holds the whole shell: `header.top-nav` → `.nav-container` with `.logo` (`nav.companyName`, `nav.subtitle`), `nav.nav-tabs` of `router-link`s, `<LanguageSwitcher />`, `<ProfileMenu />`; then `<FilterBar />`; then `main.main-content` with `<router-view />`; then `ProfileDetailsModal` and `TasksModal` at root.
- App.vue's `setup()` owns the task state and handlers (`tasks`, `addTask`, `deleteTask`, `toggleTask`, `showProfileDetails`, `showTasks`). Leave this logic in App.vue; only the template and styles change.
- Routes live in `client/src/main.js`.
- Active state is computed by hand (`:class="{ active: $route.path === '/' }"`); replace with `router-link` active classes, exact for `/`.

## Nav items (copy verbatim)
| Path | Label |
|---|---|
| `/` | `t('nav.overview')` |
| `/inventory` | `t('nav.inventory')` |
| `/orders` | `t('nav.orders')` |
| `/spending` | `t('nav.finance')` |
| `/demand` | `t('nav.demandForecast')` |
| `/reports` | literal `Reports` (no i18n key) |

The `Reports` literal is an existing gap. Keep it literal and mention it to the user; adding a key to `client/src/locales/en.js` and `ja.js` is a separate change for them to approve.

`client/src/views/Backlog.vue` exists without a route; leave it alone.

## Header widgets and their couplings
- `ProfileMenu.vue`: emits `show-profile-details` and `show-tasks`; App.vue binds them to `showProfileDetails = true` / `showTasks = true`. Its `.dropdown-menu` is `position: absolute; top: calc(100% + 0.5rem); z-index: 1000`, so it opens downward: flip it upward in the sidebar footer.
- `LanguageSwitcher.vue`: same downward dropdown (`top: calc(100% + 0.5rem); z-index: 1000`): flip it the same way. App.vue also targets it with `.nav-container > .language-switcher`; that rule goes away with the header.
- `FilterBar.vue`: `.filters-bar` is `position: sticky; top: 70px; z-index: 90`, where 70px is the old header height. It belongs in the content column, sticky at `top: 0` (or `top: var(--topbar-h)` beneath a topbar). It holds four selects (time period, location, category, order status) bound to `useFilters()`; keep the bindings untouched.

## Global styles
App.vue's unscoped `<style>` holds the shared classes the views use: `.page-header`, `.stats-grid`, `.stat-card` (+ `.warning/.success/.danger/.info`), `.stat-label`, `.stat-value`, `.card`, `.card-header`, `.card-title`, `.table-container`, `table/th/td`, `.badge` (+ `success/warning/danger/info/increasing/decreasing/stable/high/medium/low`), `.loading`, `.error`. Put the token block at the top of this stylesheet and refactor these classes in place. Delete `.top-nav`, `.nav-container`, `.logo`, `.subtitle`, `.nav-tabs*` once the sidebar replaces them.

Views are in `client/src/views/` (Dashboard, Inventory, Orders, Spending, Demand, Reports); modals in `client/src/components/*Modal.vue` carry their own scoped styles and need the modal treatment from `component-polish.md`.

## Pre-existing console noise (not caused by the redesign)
- `GET /api/tasks` 404s: `client/src/api.js` calls task endpoints that `server/main.py` doesn't define.
- `Dashboard.vue` renders `<PurchaseOrderModal>`, which is neither imported nor present in `components/`; Vue warns "Failed to resolve component".
Report these to the user once; they're separate fixes.

## Verification specifics
- Playwright MCP may not be loaded in the session. The browsers and a `playwright` package are usually cached (`~/Library/Caches/ms-playwright`, `~/.npm/_npx/*/node_modules/playwright`); a short Node script requiring that package covers screenshots and interaction checks. When clicking "outside" to close a dropdown, click its trigger again: a blind page click can land on a clickable table row and open a modal.
- `cd client && npm run build` must pass.
- Visit all six routes; switch language to Japanese and confirm nav labels and the longer strings fit in the expanded sidebar.
- Open Profile → Profile details and Profile → Tasks; add, toggle and delete a task.
- Change each filter and confirm the data on Dashboard, Inventory and Orders updates.
