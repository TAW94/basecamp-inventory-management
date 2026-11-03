# Verification checklist

Run every item. Report any item that fails and cannot be fixed as a known gap, with the reason.

## Build and runtime
- [ ] Production build passes (`npm run build` or the project's equivalent).
- [ ] Dev server loads with zero console errors and zero Vue warnings on every route.

## Preservation (against the list from step 1)
- [ ] Every route renders its view.
- [ ] Every nav item shows the same label source as before (i18n key or literal) and links to the same path.
- [ ] Exactly one nav item is active per route; `/` is active only on `/`.
- [ ] Every relocated widget works: dropdowns open fully on screen and above the topbar, every emitted event still opens its modal or triggers its action.
- [ ] Global filters change the data as before.
- [ ] Switching language updates the sidebar, topbar and pages; longest labels fit the expanded sidebar.

## Layout
Screenshot at 1440, 1024 and 390px wide (Playwright MCP when available) and check:
- [ ] 1440: expanded sidebar, sticky full-height; topbar sticky; content capped at `--content-max` and centered.
- [ ] 1024: collapse toggle switches between sidebar and rail; preference survives a reload; rail tooltips show labels.
- [ ] 390: drawer opens from the hamburger and closes on overlay, Esc and nav click; content is one column; no horizontal page scroll; wide tables scroll inside their card.
- [ ] Spacing: page padding, section gaps and card padding match across all views.

## Accessibility
- [ ] Tab order runs sidebar → topbar → content; every interactive element shows a visible focus ring.
- [ ] Sidebar is a `nav` with an accessible name; icon-only controls (rail items, hamburger, collapse toggle) have accessible names.
- [ ] Text contrast ≥ 4.5:1 (large text ≥ 3:1), including badges, muted text and the active nav item.

## Cleanup
- [ ] Old header markup and its CSS are removed; no dead selectors left targeting it.
- [ ] No raw color, spacing or radius values remain in the shared styles.
- [ ] No new dependencies in `package.json`.
