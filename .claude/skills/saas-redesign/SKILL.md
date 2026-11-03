---
name: saas-redesign
description: Redesign a Vue 3 app's UI into a modern SaaS layout with a left vertical sidebar in place of a top nav bar, a token-based spacing scale, and polished cards, tables and forms. Use when asked to redesign or modernize the UI, add sidebar navigation, replace the top nav, or make the app look professional.
---

# SaaS Redesign (Vue 3)

Turn a top-nav Vue 3 app into a sidebar **shell** (sidebar + content column) styled entirely from design **tokens**. The redesign is visual only: every route, i18n key, emitted event, filter and modal keeps working exactly as before. **Preserve** is the rule for behaviour; **tokens** is the rule for style.

Project rules beat skill defaults. If the repo's `CLAUDE.md` names colors, fonts, banned elements (e.g. emojis) or a mandatory subagent for `.vue` edits, follow it and map the tokens onto it.

If this repo is `basecamp-inventory-management`, read [`references/project-notes.md`](references/project-notes.md) before step 1; it pre-answers discovery and lists known traps.

## Steps

### 1. Discover the shell
Find, by reading (no edits yet):
- The shell component holding the nav (`App.vue` or a `layouts/` component) and the router config (`main.js` or `router/`).
- Every nav link: path, label source (i18n key or literal), active-state logic.
- Every widget mounted in the header (profile menu, language/theme switcher, global filters, search) and its props/events.
- Where global styles live, existing CSS variables, and whether a CSS framework (Tailwind, UnoCSS, a component library) is in use.
- Anything coupled to the header's geometry: `position: sticky` offsets (`top: 70px`), dropdowns positioned `top: 100%`, `z-index` layers, `100vh` math.

Done when you can write a **preservation list**: each route, nav label source, header widget with its events, and each geometry coupling. Keep it; step 7 checks against it.

### 2. Survey the pages
For each view, note its page-header markup, card/stat/table patterns, and ad-hoc spacing values (`grep -nE '(margin|padding|gap)[^;]*[0-9]+(px|rem)'`). Done when every view is listed with the shared classes it uses and the one-off values to normalize.

### 3. Lay down tokens
Add the `:root` token set from [`references/design-tokens.md`](references/design-tokens.md) to the global stylesheet, seeding colors from the project's existing palette. Use the styling approach already in the project; add no new dependency. Done when every color, spacing, radius, shadow and font size the next steps need exists as a token.

### 4. Build the shell
Follow [`references/layout-shell.md`](references/layout-shell.md): extract `AppSidebar.vue` (and `AppTopbar.vue` when there are global filters or page actions), switch the root to the grid shell, relocate header widgets, fix every geometry coupling from step 1, and add the collapsed rail and mobile drawer. Done when the old header markup and its CSS are gone and every item on the preservation list has a new home.

### 5. Polish components
Restyle shared classes (page header, stat cards, cards, tables, badges, buttons, inputs, modals, loading/empty/error states) per [`references/component-polish.md`](references/component-polish.md), refactoring the existing class names in place so views need no markup changes. Done when every shared class reads its values from tokens.

### 6. Normalize spacing
Replace the one-off values from step 2 with tokens, view by view. The sidebar narrows the content column, so fixed-width grids, charts and inputs that fit before now overflow: measure horizontal page overflow per route at 1440/1024/390 and fix each at its source (`minmax(0, 1fr)` grids, wrapping card headers, charts scrolling inside their card). Done when the step 2 grep returns only token references (or justified exceptions you can name) and no route overflows horizontally at any of the three widths.

### 7. Verify
Run [`checklist.md`](checklist.md) in full. Done when every item passes or is reported to the user as a known gap.

## Delegation
When the project mandates a subagent for `.vue` work, run steps 1–2 yourself, then hand steps 3–5 to that agent with: the preservation list and the paths of the reference files. Verify the shell (step 7's layout and preservation items) before step 6. Step 6 splits cleanly into parallel agents by disjoint file sets (views; modal components), each told which files the others own. Run step 7 yourself on the combined result.

- If the named agent isn't registered (project `.claude/agents` load only when the session starts inside the repo), run a general-purpose agent told to read and act as that agent's `.md` file.
- Tell every agent the dev servers are already running and must stay up; verification needs them.

## Working rhythm
One step per reviewable change. After steps 4, 5 and 6, run the build and load the app once before moving on, so a breakage points to a single step.
