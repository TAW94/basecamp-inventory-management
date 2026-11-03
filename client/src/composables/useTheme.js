import { ref, readonly } from 'vue'

// Theme: 'light' | 'dark', applied as <html data-theme="...">.
// The same storage key and fallback logic live in the inline <script> in
// client/index.html, which sets data-theme before first paint. Keep the two in sync.
//   1. A stored explicit choice ('light' | 'dark') wins.
//   2. Otherwise follow prefers-color-scheme, live, until the user toggles.
const STORAGE_KEY = 'theme'
const QUERY = '(prefers-color-scheme: dark)'

const hasWindow = typeof window !== 'undefined' && typeof window.matchMedia === 'function'

// localStorage can throw (private mode, blocked site data); treat as "no choice".
const readStored = () => {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    return value === 'dark' || value === 'light' ? value : null
  } catch (err) {
    return null
  }
}

const writeStored = (value) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, value)
  } catch (err) {
    // Storage unavailable: the choice simply lasts for this page load.
  }
}

const systemTheme = () => (hasWindow && window.matchMedia(QUERY).matches ? 'dark' : 'light')

// Module-level state so every consumer shares one instance.
let hasExplicitChoice = hasWindow ? readStored() !== null : false
const theme = ref(hasWindow ? readStored() || systemTheme() : 'light')

const apply = (value) => {
  if (typeof document !== 'undefined') document.documentElement.dataset.theme = value
}

const toggleTheme = () => {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  hasExplicitChoice = true
  writeStored(theme.value)
  apply(theme.value)
}

apply(theme.value)

// Follow live OS changes only while the user has not chosen explicitly.
if (hasWindow) {
  const mql = window.matchMedia(QUERY)
  const onSystemChange = (e) => {
    if (hasExplicitChoice) return
    theme.value = e.matches ? 'dark' : 'light'
    apply(theme.value)
  }
  if (typeof mql.addEventListener === 'function') mql.addEventListener('change', onSystemChange)
  else if (typeof mql.addListener === 'function') mql.addListener(onSystemChange)
}

export function useTheme() {
  return { theme: readonly(theme), toggleTheme }
}
