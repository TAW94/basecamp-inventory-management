import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'

// Breakpoints for the shell. Keep in sync with the media queries in
// App.vue, AppSidebar.vue and AppTopbar.vue.
//   >= 1024px     desktop: expanded sidebar, user can collapse to a rail (persisted)
//   768 - 1023px  tablet:  icons-only rail by default, user can expand (not persisted)
//   < 768px       mobile:  off-canvas drawer opened from the topbar hamburger
const DESKTOP_QUERY = '(min-width: 1024px)'
const MOBILE_QUERY = '(max-width: 767px)'
const STORAGE_KEY = 'sidebar-collapsed'

const hasWindow = typeof window !== 'undefined' && typeof window.matchMedia === 'function'

const matches = (query) => (hasWindow ? window.matchMedia(query).matches : false)

// localStorage can throw (private mode, blocked site data); fall back to expanded.
const readStoredCollapsed = () => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true'
  } catch (err) {
    return false
  }
}

const writeStoredCollapsed = (value) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(value))
  } catch (err) {
    // Storage unavailable: the preference simply lasts for this page load.
  }
}

// Module-level state so App.vue, AppSidebar and AppTopbar share one instance.
// Initialised synchronously so the first render already has the right layout.
const isDesktop = ref(hasWindow ? matches(DESKTOP_QUERY) : true)
const isMobile = ref(matches(MOBILE_QUERY))
const userCollapsed = ref(hasWindow ? readStoredCollapsed() : false)
const tabletExpanded = ref(false)
const drawerOpen = ref(false)
let returnFocusEl = null

// Effective rail state. The mobile drawer always shows full labels.
const collapsed = computed(() => {
  if (isMobile.value) return false
  if (isDesktop.value) return userCollapsed.value
  return !tabletExpanded.value
})

const toggleCollapsed = () => {
  if (isDesktop.value) {
    userCollapsed.value = !userCollapsed.value
    writeStoredCollapsed(userCollapsed.value)
  } else if (!isMobile.value) {
    tabletExpanded.value = !tabletExpanded.value
  }
}

const openDrawer = () => {
  // Remember the trigger (the hamburger) so focus can return to it on close.
  returnFocusEl = document.activeElement
  drawerOpen.value = true
}

const closeDrawer = () => {
  if (!drawerOpen.value) return
  drawerOpen.value = false
  const el = returnFocusEl
  returnFocusEl = null
  nextTick(() => {
    if (el && typeof el.focus === 'function') el.focus()
  })
}

export function useSidebar() {
  return {
    collapsed,
    drawerOpen,
    isMobile,
    toggleCollapsed,
    openDrawer,
    closeDrawer
  }
}

// Installs the media-query, Esc and body-scroll-lock listeners. Call once,
// from the shell root (App.vue).
export function useSidebarListeners() {
  let desktopMql = null
  let mobileMql = null

  const onDesktopChange = (e) => {
    isDesktop.value = e.matches
  }
  const onMobileChange = (e) => {
    isMobile.value = e.matches
    // Leaving the mobile range with the drawer open would leave the body locked.
    if (!e.matches) drawerOpen.value = false
  }
  const onTabletEnter = () => {
    // Each time the viewport enters the tablet range it starts as a rail again.
    if (!isDesktop.value && !isMobile.value) tabletExpanded.value = false
  }

  const onKeydown = (e) => {
    if (e.key === 'Escape' && drawerOpen.value) closeDrawer()
  }

  // Lock page scroll behind the open drawer.
  watch(drawerOpen, (open) => {
    document.body.style.overflow = open ? 'hidden' : ''
  })

  onMounted(() => {
    if (!hasWindow) return
    desktopMql = window.matchMedia(DESKTOP_QUERY)
    mobileMql = window.matchMedia(MOBILE_QUERY)
    desktopMql.addEventListener('change', onDesktopChange)
    desktopMql.addEventListener('change', onTabletEnter)
    mobileMql.addEventListener('change', onMobileChange)
    mobileMql.addEventListener('change', onTabletEnter)
    document.addEventListener('keydown', onKeydown)
  })

  onBeforeUnmount(() => {
    if (desktopMql) {
      desktopMql.removeEventListener('change', onDesktopChange)
      desktopMql.removeEventListener('change', onTabletEnter)
    }
    if (mobileMql) {
      mobileMql.removeEventListener('change', onMobileChange)
      mobileMql.removeEventListener('change', onTabletEnter)
    }
    document.removeEventListener('keydown', onKeydown)
    document.body.style.overflow = ''
  })
}
