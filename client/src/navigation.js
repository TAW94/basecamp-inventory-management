// Main navigation: the single source for the sidebar links and the topbar
// page title. Paths and i18n keys are copied verbatim from the former top nav.
// `label` is a fallback for items without an i18n key (none currently).
export const navItems = [
  { to: '/', labelKey: 'nav.overview', icon: 'grid' },
  { to: '/inventory', labelKey: 'nav.inventory', icon: 'box' },
  { to: '/orders', labelKey: 'nav.orders', icon: 'cart' },
  { to: '/spending', labelKey: 'nav.finance', icon: 'wallet' },
  { to: '/demand', labelKey: 'nav.demandForecast', icon: 'trending' },
  { to: '/restocking', labelKey: 'nav.restocking', icon: 'refresh' },
  { to: '/reports', labelKey: 'nav.reports', icon: 'file' }
]

export const navLabel = (item, t) => (item.labelKey ? t(item.labelKey) : item.label)
