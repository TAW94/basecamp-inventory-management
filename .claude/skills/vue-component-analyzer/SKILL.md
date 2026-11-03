---
name: vue-component-analyzer
description: Analyze the structure of Vue 3 components and suggest ranked optimizations for rendering performance and code reuse (shared components, composables, utils, duplicated CSS). Use this skill whenever the user asks to audit, review, analyze, clean up, or speed up Vue components or views, asks why a page re-renders or feels slow, wants to find duplicated code or a candidate for a shared component or composable, or asks "what can we extract / reuse" in the frontend, even if they don't say "analyze". Works on one file, a folder, or the whole client/src. Reports first, then applies only the fixes the user picks.
---

# Vue Component Analyzer

Finds performance and reuse problems in Vue 3 SFCs, ranks them by how much they matter, and hands the user a short list they can act on. The output is a report in chat; code changes only happen after the user chooses which findings to fix.

## Why this skill works the way it does

Reading 20 components by hand burns context and misses cross-file duplication, because duplication is only visible when you compare files. So a scanner does the mechanical comparison first, and your time goes to judgement: is this lead real, does it matter at this app's scale, and what is the right fix. The scanner produces _leads, not verdicts_. Most of its value is in pointing you at the right lines.

## Workflow

### 1. Scope

Default scope is `client/src`. If the user names a file or folder, still scan all of `client/src` (duplication needs the whole picture) but report only findings that touch their scope, plus cross-file duplicates involving it.

### 2. Run the scanner

```bash
node .claude/skills/vue-component-analyzer/scripts/scan_vue.mjs client/src
```

Add `--json` for the full, untruncated data. The scan takes well under a second and prints:

- per-component line counts (template/script/style), API style (`script-setup`, `setup()`, `options`), reactive stats, and template function calls that run inside `v-for`
- findings: `vfor-missing-key`, `vfor-index-key`, `vfor-with-vif`, `vfor-inline-transform`, `deep-watch`, `listener-not-removed`, `interval-not-cleared`, `console-log`
- identical functions across files, same-named functions with different bodies, identical CSS rule bodies, identical inline SVGs
- class-name clusters shared by 3+ components, which usually indicate a repeated UI pattern worth extracting

The scanner needs `client/node_modules` (it uses `vue/compiler-sfc`). If it fails, run `npm install` in `client/` or fall back to reading files directly.

### 3. Verify every lead before reporting it

Open the cited lines and confirm. Typical false positives:

- **Calls in `v-for`**: `t()` or a cheap formatter per row is fine. It only matters when the function does real work per call (filtering, sorting, `new Date` parsing on large lists, building objects) or when the list is large. Data in this app is mock JSON with tens to low hundreds of rows, so say so honestly instead of inflating the impact.
- **Same-named functions**: different bodies may be intentionally different (`formatDate` with and without time). Check whether they could share one helper with an option, or whether they truly differ.
- **Identical CSS**: scoped styles in sibling components are sometimes duplicated on purpose; look for a comment explaining it. Check whether `client/src/App.vue` already has a global class for it (it has cards, tables, stat cards, badges, loading/error states). Reusing an existing global class beats creating a new abstraction.
- **`vfor-index-key`**: harmless for static, never-reordered lists; real for lists that are filtered, sorted, or edited.

Drop anything you can't confirm. A short accurate report is worth more than a long one.

### 4. Look for what the scanner can't see

Read the largest components and the ones with many findings, checking:

**Correctness** (the scanner only finds patterns, so read the views' load functions and shared state yourself; these bugs tend to matter more to the user than any performance item)

- Async loads: is `error` reset before each load? Can an older request finish last and overwrite newer data when filters change quickly? Does a reload tear down the whole view (`v-if="loading"` around everything) and lose scroll or open state?
- Reactivity holes: mutating the result of a `computed`, or a plain object that is not wrapped in `ref`/`reactive`, so the UI never updates.
- Data contracts: a component reading fields its parent never sets (shows `undefined`), or a modal fed a differently shaped object by different callers.
- Dead wiring: state and handlers for UI that is no longer rendered (buttons that do nothing).

**Performance**

- Expensive derived data computed in methods or in the template instead of `computed` (re-runs every render). The `vfor-inline-transform` finding often points here.
- Watchers that only derive a value and could be a `computed`; `deep: true` watchers on big objects.
- Large static data (lookup tables, chart configs) wrapped in `ref`/`reactive`. A plain `const` or `shallowRef`/`markRaw` avoids deep proxying.
- Duplicate fetches: several components calling the same `api.*` endpoint on mount, or reloading on filter changes that endpoint doesn't support (inventory has no month filter).
- Heavy modals or views loaded eagerly. Check `client/src/main.js` / router for route-level `() => import(...)`, and consider `defineAsyncComponent` for modals that are rarely opened.
- `v-if` on frequently toggled heavy blocks (charts, tabs) where `v-show` avoids re-mounting, and the reverse for rarely shown content.
- Event listeners/timers added in `onMounted` without cleanup in `onUnmounted`.

**Reuse**

- A repeated UI shell (the modal overlay/header/footer, page header + card, stat cards) is a candidate for a base component with slots.
- Repeated script patterns (load data with loading/error state and re-load on filter change; translate helpers; status-to-class mappers) are candidates for a composable in `client/src/composables/` or a helper in `client/src/utils/`. Check those folders first; if a helper already exists there, the fix is "use it", not "create it".
- Mixed API styles (`<script setup>` vs `export default { setup() }`): mention it once as a consistency item, not per file, and don't recommend migrating as a performance fix (it isn't one).

### 5. Rank and report

Score each finding by **impact × confidence ÷ effort**. Put real bugs (missing/index keys on dynamic lists, leaks) first, then reuse wins that remove the most duplicated lines, then performance items with measurable effect, then consistency nits. Cap the main list at about 10 items; group the rest into one "Minor" line.

Use this format. It is a plain numbered list on purpose: findings carry long file lists and sentences, and wide markdown tables turn into rows of raw `|` characters in terminals and many viewers, which makes them unreadable. A list reads the same everywhere. Do not use tables anywhere in the report.

````markdown
## Vue component analysis: <scope>

<One or two sentences: overall state and the single most valuable change.>

### Findings

**1. Bug: `:key="idx"` on a list that gets filtered** (effort: S)
- Where: `client/src/views/Orders.vue:98`
- Problem: <what is wrong and what the user would notice, in one or two sentences>
- Fix: Key by `item.sku`.

**2. Reuse: modal shell duplicated in 6 files** (effort: M)
- Where: `BacklogDetailModal.vue`, `CostDetailModal.vue`, ... (all in `client/src/components/`)
- Problem: Overlay, header, close button and footer plus ~170 lines of CSS are copied into every modal.
- Fix: Extract `client/src/components/BaseModal.vue` with `title`, default and `footer` slots.

...

### Minor
- <one short line per item, with `file:line`; or "None">

### Not worth changing
- <lead you checked and rejected>: <why, in one line>

Which of these should I fix? (e.g. "1, 2, 4" or "all bugs")
````

Each finding is a bold title line (`<number>. <Type>: <short issue>` plus effort), followed by exactly three bullets: **Where**, **Problem**, **Fix**. Keep each bullet to one or two sentences; if a finding needs a long file list, put the list in Where and keep Problem short. Code sketches, when they genuinely help, go in a fenced block under the finding, not inline.

Type is one of Bug, Reuse, Performance, Consistency. Effort: S (under 15 min, one file), M (a new shared component/composable or several files), L (cross-cutting refactor). Every finding needs a clickable `file:line` (or a file list for cross-file items) and a concrete fix, not "consider refactoring".

### 6. Apply only what the user picks

- Any creation or significant change of a `.vue` file goes to the **vue-expert** subagent (project rule in CLAUDE.md). Give it the findings, the exact files and lines, and the intended end state. Plain `.js` utils/composables you can edit directly.
- Keep behavior and visuals identical: same classes, same design system (slate/gray palette, no emojis), same i18n keys. A reuse refactor that changes how a page looks is a regression.
- Comment non-obvious logic changes (CLAUDE.md code style rule).
- After the changes, run `npm run build` in `client/` to catch template and import errors, and if the dev servers are running, check the affected pages with the Playwright MCP tools at `http://localhost:3000`.
- Finish with a short summary: what changed per finding, files touched, how it was verified, and anything left undone.
