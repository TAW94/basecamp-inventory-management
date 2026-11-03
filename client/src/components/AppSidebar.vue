<template>
  <aside
    id="app-sidebar"
    ref="sidebarEl"
    class="sidebar"
    :class="{ 'is-collapsed': collapsed, 'is-open': drawerOpen }"
    @keydown.tab="trapFocus"
  >
    <div class="sidebar-brand">
      <span class="brand-mark" aria-hidden="true">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M12 2l10 5-10 5L2 7z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      </span>
      <div class="brand-text">
        <span class="brand-name">{{ t('nav.companyName') }}</span>
        <span class="brand-subtitle">{{ t('nav.subtitle') }}</span>
      </div>
    </div>

    <nav class="sidebar-nav" aria-label="Main">
      <ul class="nav-list">
        <li v-for="item in items" :key="item.to">
          <!--
            Active state comes from router-link. Every item highlights on its
            exact route; '/' keeps the default (unstyled) active-class so it
            only highlights on an exact match and not on every page.
          -->
          <router-link
            :to="item.to"
            class="nav-item"
            :active-class="item.to === '/' ? 'router-link-active' : 'is-active'"
            exact-active-class="is-active"
            :title="collapsed ? labelFor(item) : null"
            @click="$emit('navigate')"
          >
            <svg
              class="nav-icon"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path v-for="d in icons[item.icon]" :key="d" :d="d" />
            </svg>
            <span class="nav-label">{{ labelFor(item) }}</span>
          </router-link>
        </li>
      </ul>
    </nav>

    <div class="sidebar-footer">
      <!-- Profile menu and language switcher are passed in by App.vue so their event bindings stay there. -->
      <slot name="footer" />
      <button
        type="button"
        class="collapse-toggle"
        :aria-label="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        :title="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        :aria-expanded="String(!collapsed)"
        aria-controls="app-sidebar"
        @click="$emit('toggle-collapse')"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M11 17l-5-5 5-5" />
          <path d="M18 17l-5-5 5-5" />
        </svg>
      </button>
    </div>
  </aside>
</template>

<script>
import { ref, watch, nextTick } from 'vue'
import { useI18n } from '../composables/useI18n'
import { navItems, navLabel } from '../navigation'

// Outline icons (24px grid, Lucide-style), one or more path strings each.
const icons = {
  grid: ['M3 3h7v9H3z', 'M14 3h7v5h-7z', 'M14 12h7v9h-7z', 'M3 16h7v5H3z'],
  box: ['M21 8l-9-5-9 5 9 5 9-5z', 'M3 8v8l9 5 9-5V8', 'M12 13v8'],
  cart: [
    'M3 3h2l2.4 11.2a2 2 0 0 0 2 1.6h8.1a2 2 0 0 0 2-1.5L21 7H6.2',
    'M10 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
    'M18 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2z'
  ],
  wallet: [
    'M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v3',
    'M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-3',
    'M21 11h-4a2 2 0 0 0 0 4h4z'
  ],
  trending: ['M22 7l-8.5 8.5-5-5L2 17', 'M16 7h6v6'],
  refresh: ['M21 12a9 9 0 1 1-2.64-6.36L21 8', 'M21 3v5h-5'],
  file: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M16 13H8', 'M16 17H8', 'M10 9H8']
}

const FOCUSABLE = 'a[href], button:not([disabled]), select, input, [tabindex]:not([tabindex="-1"])'

export default {
  name: 'AppSidebar',
  props: {
    // Icons-only rail (desktop after user collapse, tablet by default).
    collapsed: {
      type: Boolean,
      default: false
    },
    // Mobile off-canvas drawer is open.
    drawerOpen: {
      type: Boolean,
      default: false
    }
  },
  emits: ['toggle-collapse', 'navigate'],
  setup(props) {
    const { t } = useI18n()
    const sidebarEl = ref(null)

    const labelFor = (item) => navLabel(item, t)

    const getFocusable = () => {
      if (!sidebarEl.value) return []
      return Array.from(sidebarEl.value.querySelectorAll(FOCUSABLE)).filter((el) => el.offsetParent !== null)
    }

    // When the drawer opens, move focus to the current page link (or the first link).
    watch(
      () => props.drawerOpen,
      (open) => {
        if (!open) return
        nextTick(() => {
          if (!sidebarEl.value) return
          const target =
            sidebarEl.value.querySelector('.nav-item.is-active') || sidebarEl.value.querySelector('.nav-item')
          if (target) target.focus()
        })
      }
    )

    // Keep Tab / Shift+Tab inside the drawer while it is open over the page.
    const trapFocus = (e) => {
      if (!props.drawerOpen) return
      const focusable = getFocusable()
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    return {
      t,
      items: navItems,
      icons,
      sidebarEl,
      labelFor,
      trapFocus
    }
  }
}
</script>

<style scoped>
.sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  padding: 0 var(--space-2) var(--space-3);
  z-index: var(--z-sidebar);
  /*
    No overflow on the aside itself: overflow would clip the footer dropdowns
    that open to the right of the rail. The nav list scrolls instead.
  */
}

/* Brand block matches the topbar's minimum height so both bottom edges line up. */
.sidebar-brand {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: var(--topbar-h);
  flex-shrink: 0;
  padding: 0 var(--space-2);
  margin-bottom: var(--space-2);
}

.brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: var(--radius-md);
  background: var(--color-accent);
  color: var(--color-on-accent);
}

.brand-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.brand-name {
  font-size: var(--text-sm);
  font-weight: var(--weight-semibold);
  color: var(--color-text);
  line-height: var(--leading-tight);
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Wraps (up to two lines) rather than truncating, so it reads in full in en and ja. */
.brand-subtitle {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  line-height: var(--leading-tight);
  margin-top: 2px;
  overflow-wrap: anywhere;
}

.sidebar-nav {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  /* Inset so the focus outline of full-width items is not clipped by the scroll box. */
  padding: var(--space-1);
}

.nav-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  height: 40px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  text-decoration: none;
  white-space: nowrap;
  transition:
    background var(--transition),
    color var(--transition);
}

.nav-item:hover {
  background: var(--color-surface-muted);
  color: var(--color-text);
}

.nav-item.is-active {
  background: var(--color-accent-soft);
  color: var(--color-accent);
}

.nav-item:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

.nav-icon {
  flex-shrink: 0;
}

.nav-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-footer {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  flex-shrink: 0;
  padding: var(--space-3) var(--space-1) 0;
  border-top: 1px solid var(--color-border);
}

.collapse-toggle {
  align-self: flex-end;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  transition:
    background var(--transition),
    color var(--transition);
}

.collapse-toggle:hover {
  background: var(--color-surface-muted);
  color: var(--color-text);
}

.collapse-toggle:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

.collapse-toggle svg {
  transition: transform var(--transition);
}

/* ---------- Icons-only rail ---------- */

/* Visually hidden but still read by screen readers. */
.sidebar.is-collapsed .brand-text,
.sidebar.is-collapsed .nav-label,
.sidebar.is-collapsed :deep(.profile-name),
.sidebar.is-collapsed :deep(.language-label),
.sidebar.is-collapsed :deep(.theme-label) {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.sidebar.is-collapsed .sidebar-brand,
.sidebar.is-collapsed .nav-item {
  justify-content: center;
  padding: 0;
}

.sidebar.is-collapsed .collapse-toggle {
  align-self: center;
}

/* Chevron points right: "expand". */
.sidebar.is-collapsed .collapse-toggle svg {
  transform: rotate(180deg);
}

/* Profile menu collapses to the avatar, language switcher to the globe, theme toggle to its icon. */
.sidebar.is-collapsed :deep(.chevron) {
  display: none;
}

.sidebar.is-collapsed :deep(.profile-button),
.sidebar.is-collapsed :deep(.language-button),
.sidebar.is-collapsed :deep(.theme-button) {
  justify-content: center;
  padding: 0;
}

/*
  In the rail the footer dropdowns open to the right, outside the sidebar.
  Offset = widget width + the footer's inner inset (sidebar padding --space-2
  + footer padding --space-1 = --space-3) + a --space-2 gap.
*/
.sidebar.is-collapsed :deep(.dropdown-menu) {
  top: auto;
  bottom: 0;
  right: auto;
  left: calc(100% + var(--space-3) + var(--space-2));
}

/* ---------- Mobile drawer (< 768px) ---------- */
@media (max-width: 767px) {
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: min(var(--sidebar-w), 85vw);
    height: 100%;
    /* Above the overlay (--z-overlay) it slides over. */
    z-index: calc(var(--z-overlay) + 1);
    box-shadow: var(--shadow-lg);
    transform: translateX(-100%);
    /* visibility keeps the closed drawer out of the tab order; it flips after the slide-out ends. */
    visibility: hidden;
    transition:
      transform 200ms ease,
      visibility 0s linear 200ms;
  }

  .sidebar.is-open {
    transform: translateX(0);
    visibility: visible;
    transition:
      transform 200ms ease,
      visibility 0s;
  }

  /* The drawer has no rail mode; overlay, Esc and nav clicks close it. */
  .collapse-toggle {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sidebar,
  .sidebar.is-open,
  .collapse-toggle svg {
    transition: none;
  }
}
</style>
