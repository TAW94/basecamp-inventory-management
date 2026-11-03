<template>
  <!--
    >= 768px: one sticky bar holding the global filters (the view's own
    page header carries the title, so the bar shows none).
    < 768px: the root switches to display: contents so its two children lay
    out directly in the content column: the hamburger + title row stays sticky
    and the filters scroll away with the page.
  -->
  <header class="topbar">
    <div class="topbar-bar">
      <button
        type="button"
        class="menu-button"
        aria-label="Open navigation"
        aria-controls="app-sidebar"
        :aria-expanded="String(drawerOpen)"
        @click="$emit('open-drawer')"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <path d="M4 6h16" />
          <path d="M4 12h16" />
          <path d="M4 18h16" />
        </svg>
      </button>
      <h1 class="topbar-title">{{ pageTitle }}</h1>
    </div>
    <FilterBar />
  </header>
</template>

<script>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from '../composables/useI18n'
import { navItems, navLabel } from '../navigation'
import FilterBar from './FilterBar.vue'

export default {
  name: 'AppTopbar',
  components: {
    FilterBar
  },
  props: {
    drawerOpen: {
      type: Boolean,
      default: false
    }
  },
  emits: ['open-drawer'],
  setup() {
    const route = useRoute()
    const { t } = useI18n()

    // Page title (mobile only) comes from the same nav array the sidebar renders.
    const pageTitle = computed(() => {
      const item = navItems.find((i) => i.to === route.path)
      return item ? navLabel(item, t) : ''
    })

    return {
      pageTitle
    }
  }
}
</script>

<style scoped>
/* Desktop and tablet: a single sticky bar; it grows if the filters wrap. */
.topbar {
  position: sticky;
  top: 0;
  min-height: var(--topbar-h);
  display: flex;
  align-items: center;
  z-index: var(--z-topbar);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

/* Hamburger + title row: mobile only. */
.topbar-bar {
  display: none;
}

.topbar-title {
  font-size: var(--text-lg);
  font-weight: var(--weight-semibold);
  color: var(--color-text);
  letter-spacing: -0.01em;
  line-height: var(--leading-tight);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.menu-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  margin-left: calc(var(--space-2) * -1);
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition:
    background var(--transition),
    color var(--transition);
}

.menu-button:hover {
  background: var(--color-surface-muted);
  color: var(--color-text);
}

.menu-button:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

@media (max-width: 767px) {
  /*
    display: contents removes the header's own box, so .topbar-bar becomes
    sticky against the whole content column (a sticky child of a normal box
    would only stick within that box) while FilterBar scrolls normally.
  */
  .topbar {
    display: contents;
  }

  .topbar-bar {
    position: sticky;
    top: 0;
    z-index: var(--z-topbar);
    display: flex;
    align-items: center;
    gap: var(--space-3);
    height: var(--topbar-h);
    padding: 0 var(--page-pad);
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
  }
}
</style>
