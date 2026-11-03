<template>
  <div class="app-shell" :class="{ 'is-collapsed': collapsed, 'is-drawer-open': drawerOpen }">
    <AppSidebar
      :collapsed="collapsed"
      :drawer-open="drawerOpen"
      @toggle-collapse="toggleCollapsed"
      @navigate="closeDrawer"
    >
      <template #footer>
        <LanguageSwitcher />
        <ThemeToggle />
        <ProfileMenu @show-profile-details="showProfileDetails = true" @show-tasks="showTasks = true" />
      </template>
    </AppSidebar>
    <div v-if="drawerOpen" class="sidebar-overlay" @click="closeDrawer" />
    <div class="app-main">
      <AppTopbar :drawer-open="drawerOpen" @open-drawer="openDrawer" />
      <main class="app-content">
        <router-view />
      </main>
    </div>

    <ProfileDetailsModal :is-open="showProfileDetails" @close="showProfileDetails = false" />

    <TasksModal
      :is-open="showTasks"
      :tasks="tasks"
      @close="showTasks = false"
      @add-task="addTask"
      @delete-task="deleteTask"
      @toggle-task="toggleTask"
    />
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue'
import { api } from './api'
import { useAuth } from './composables/useAuth'
import { useI18n } from './composables/useI18n'
import ProfileMenu from './components/ProfileMenu.vue'
import ProfileDetailsModal from './components/ProfileDetailsModal.vue'
import TasksModal from './components/TasksModal.vue'
import LanguageSwitcher from './components/LanguageSwitcher.vue'
import ThemeToggle from './components/ThemeToggle.vue'
import AppSidebar from './components/AppSidebar.vue'
import AppTopbar from './components/AppTopbar.vue'
import { useSidebar, useSidebarListeners } from './composables/useSidebar'

export default {
  name: 'App',
  components: {
    ProfileMenu,
    ProfileDetailsModal,
    TasksModal,
    LanguageSwitcher,
    ThemeToggle,
    AppSidebar,
    AppTopbar
  },
  setup() {
    const { currentUser } = useAuth()
    const { t } = useI18n()
    const showProfileDetails = ref(false)
    const showTasks = ref(false)
    const apiTasks = ref([])

    // Shell layout state (rail / drawer); breakpoints and persistence live in useSidebar.
    const { collapsed, drawerOpen, toggleCollapsed, openDrawer, closeDrawer } = useSidebar()
    useSidebarListeners()

    // Merge mock tasks from currentUser with API tasks
    const tasks = computed(() => {
      return [...currentUser.value.tasks, ...apiTasks.value]
    })

    const loadTasks = async () => {
      try {
        apiTasks.value = await api.getTasks()
      } catch (err) {
        console.error('Failed to load tasks:', err)
      }
    }

    const addTask = async (taskData) => {
      try {
        const newTask = await api.createTask(taskData)
        // Add new task to the beginning of the array
        apiTasks.value.unshift(newTask)
      } catch (err) {
        console.error('Failed to add task:', err)
      }
    }

    const deleteTask = async (taskId) => {
      try {
        // Check if it's a mock task (from currentUser)
        const isMockTask = currentUser.value.tasks.some((t) => t.id === taskId)

        if (isMockTask) {
          // Remove from mock tasks
          const index = currentUser.value.tasks.findIndex((t) => t.id === taskId)
          if (index !== -1) {
            currentUser.value.tasks.splice(index, 1)
          }
        } else {
          // Remove from API tasks
          await api.deleteTask(taskId)
          apiTasks.value = apiTasks.value.filter((t) => t.id !== taskId)
        }
      } catch (err) {
        console.error('Failed to delete task:', err)
      }
    }

    const toggleTask = async (taskId) => {
      try {
        // Check if it's a mock task (from currentUser)
        const mockTask = currentUser.value.tasks.find((t) => t.id === taskId)

        if (mockTask) {
          // Toggle mock task status
          mockTask.status = mockTask.status === 'pending' ? 'completed' : 'pending'
        } else {
          // Toggle API task
          const updatedTask = await api.toggleTask(taskId)
          const index = apiTasks.value.findIndex((t) => t.id === taskId)
          if (index !== -1) {
            apiTasks.value[index] = updatedTask
          }
        }
      } catch (err) {
        console.error('Failed to toggle task:', err)
      }
    }

    onMounted(loadTasks)

    return {
      t,
      showProfileDetails,
      showTasks,
      tasks,
      addTask,
      deleteTask,
      toggleTask,
      collapsed,
      drawerOpen,
      toggleCollapsed,
      openDrawer,
      closeDrawer
    }
  }
}
</script>

<style>
/* ==========================================================================
   Design tokens. Components read these; they never hold raw values.
   ========================================================================== */
:root {
  /* Native controls and scrollbars follow the theme. */
  color-scheme: light;

  /* Spacing: 4px base. Use only these steps. */
  --space-1: 0.25rem; /* 4  */
  --space-2: 0.5rem; /* 8  */
  --space-3: 0.75rem; /* 12 */
  --space-4: 1rem; /* 16 */
  --space-5: 1.25rem; /* 20 */
  --space-6: 1.5rem; /* 24 */
  --space-8: 2rem; /* 32 */
  --space-10: 2.5rem; /* 40 */
  --space-12: 3rem; /* 48 */

  /* Type */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --text-xs: 0.75rem; /* 12: table headers, badges, captions */
  --text-sm: 0.875rem; /* 14: body in dense UI, nav items, table cells */
  --text-base: 1rem; /* 16 */
  --text-lg: 1.125rem; /* 18: card titles */
  --text-xl: 1.5rem; /* 24: page titles */
  --text-2xl: 1.875rem; /* 30: stat values */
  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --weight-medium: 500;
  --weight-semibold: 600;
  --weight-bold: 700;

  /* Neutrals (slate) */
  --color-bg: #f8fafc; /* app canvas */
  --color-surface: #ffffff; /* cards, sidebar, topbar */
  --color-surface-muted: #f1f5f9; /* hover fills, table head */
  --color-border: #e2e8f0;
  --color-border-strong: #cbd5e1;
  --color-text: #0f172a;
  --color-text-secondary: #475569;
  --color-text-muted: #64748b;

  /* Accent */
  --color-accent: #2563eb;
  --color-accent-hover: #1d4ed8;
  --color-accent-soft: #eff6ff; /* active nav fill, selected rows */
  --color-focus: #3b82f6;
  --color-on-accent: #ffffff; /* text/icons on accent fills */

  /* Status: text on soft background */
  --color-success: #047857;
  --color-success-soft: #ecfdf5;
  --color-warning: #b45309;
  --color-warning-soft: #fffbeb;
  --color-danger: #b91c1c;
  --color-danger-soft: #fef2f2;
  --color-info: #1d4ed8;
  --color-info-soft: #eff6ff;

  /* Shape and depth */
  --radius-sm: 6px; /* badges, inputs, nav items */
  --radius-md: 8px; /* buttons, dropdowns */
  --radius-lg: 12px; /* cards, modals */
  --shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.05);
  --shadow-md: 0 4px 12px rgba(15, 23, 42, 0.08);
  --shadow-lg: 0 12px 32px rgba(15, 23, 42, 0.12); /* modals, popovers */

  /* Overlay and chart tokens */
  --color-overlay: rgba(15, 23, 42, 0.45); /* modal / drawer backdrop */
  --color-chart-operational: #8b5cf6;
  --color-chart-neutral: #64748b; /* single-series bars */
  --color-on-chart-neutral: #ffffff;
  --select-chevron: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");

  /* Layout */
  --sidebar-w: 248px;
  --sidebar-w-collapsed: 72px;
  --topbar-h: 64px;
  --content-max: 1440px;
  --page-pad: var(--space-8);

  /* Motion and layers */
  --transition: 150ms ease;
  --z-topbar: 50;
  --z-sidebar: 60;
  --z-dropdown: 100;
  --z-overlay: 200;
  --z-modal: 300;
}

/* Dark theme: second set of the color tokens. Set via <html data-theme="dark">
   (see composables/useTheme.js and the inline script in index.html).
   All text pairs pass WCAG AA (4.5:1). On the dark accent, white text is only
   2.5:1, so --color-on-accent flips to the dark slate (7:1). */
:root[data-theme='dark'] {
  color-scheme: dark;

  --color-bg: #0f172a;
  --color-surface: #1e293b;
  --color-surface-muted: #273449;
  --color-border: #334155;
  --color-border-strong: #475569;
  --color-text: #f1f5f9;
  --color-text-secondary: #cbd5e1;
  --color-text-muted: #94a3b8;

  --color-accent: #60a5fa;
  --color-accent-hover: #93c5fd;
  --color-accent-soft: #263852;
  --color-focus: #93c5fd;
  --color-on-accent: #0f172a;

  --color-success: #34d399;
  --color-success-soft: #213d46;
  --color-warning: #fbbf24;
  --color-warning-soft: #393b38;
  --color-danger: #f87171;
  --color-danger-soft: #352f3f;
  --color-info: #60a5fa;
  --color-info-soft: #263852;

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.35);
  --shadow-lg: 0 12px 32px rgba(0, 0, 0, 0.5);

  --color-overlay: rgba(0, 0, 0, 0.6);
  --color-chart-operational: #a78bfa;
  --color-chart-neutral: #94a3b8;
  --color-on-chart-neutral: #0f172a;
  --select-chevron: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
}

@media (max-width: 767px) {
  :root {
    --page-pad: var(--space-4);
  }
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  line-height: var(--leading-normal);
  background: var(--color-bg);
  color: var(--color-text);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* The native select arrow ignores padding and hugs the right edge, so its
   inset differs per browser and doesn't match the left text padding. Replace
   it with a slate SVG chevron (themed) pinned at the same 12px inset, and reserve
   room on the right so long option text never runs under it.
   padding-right needs !important because component-scoped rules
   (e.g. `.filter-select { padding: 0 12px }`) out-rank this element selector. */
select {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  /* Chevron stroke is themed via --select-chevron (slate in light, lighter slate in dark). */
  background-image: var(--select-chevron);
  background-repeat: no-repeat;
  background-position: right var(--space-3) center;
  background-size: 16px 16px;
  padding-right: calc(var(--space-3) + 16px + var(--space-2)) !important;
}

/* ==========================================================================
   Shell: sidebar + content column
   ========================================================================== */
.app-shell {
  display: grid;
  grid-template-columns: var(--sidebar-w) minmax(0, 1fr);
  min-height: 100vh;
  background: var(--color-bg);
  transition: grid-template-columns var(--transition);
}

/* Rail: desktop after the user collapses it, tablet (768-1023px) by default. */
.app-shell.is-collapsed {
  grid-template-columns: var(--sidebar-w-collapsed) minmax(0, 1fr);
}

/* min-width: 0 keeps wide tables from forcing page-level horizontal scroll. */
.app-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.app-content {
  flex: 1;
  width: 100%;
  max-width: var(--content-max);
  margin: 0 auto;
  padding: var(--page-pad);
}

.sidebar-overlay {
  position: fixed;
  inset: 0;
  background: var(--color-overlay);
  z-index: var(--z-overlay);
}

/* Mobile: the sidebar leaves the grid and becomes a fixed drawer. */
@media (max-width: 767px) {
  .app-shell,
  .app-shell.is-collapsed {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (prefers-reduced-motion: reduce) {
  .app-shell {
    transition: none;
  }
}

/* ==========================================================================
   Shared view classes
   ========================================================================== */
.page-header {
  margin-bottom: var(--space-6);
}

.page-header h2 {
  font-size: var(--text-xl);
  font-weight: var(--weight-bold);
  line-height: var(--leading-tight);
  color: var(--color-text);
  letter-spacing: -0.02em;
}

.page-header p {
  margin-top: var(--space-1);
  color: var(--color-text-muted);
  font-size: var(--text-sm);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--space-5);
  margin-bottom: var(--space-6);
}

.stat-card {
  background: var(--color-surface);
  padding: var(--space-5);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  transition:
    border-color var(--transition),
    box-shadow var(--transition);
}

/* Hover lift only for stat cards that open something. */
.stat-card.clickable {
  cursor: pointer;
}

.stat-card.clickable:hover {
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-md);
}

.stat-label {
  color: var(--color-text-muted);
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-value {
  margin-top: var(--space-2);
  font-size: var(--text-2xl);
  font-weight: var(--weight-bold);
  line-height: var(--leading-tight);
  color: var(--color-text);
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}

/* Status variants color the value only, never the whole card. */
.stat-card.warning .stat-value {
  color: var(--color-warning);
}

.stat-card.success .stat-value {
  color: var(--color-success);
}

.stat-card.danger .stat-value {
  color: var(--color-danger);
}

.stat-card.info .stat-value {
  color: var(--color-info);
}

.card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
  margin-bottom: var(--space-6);
}

.card-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--color-border);
}

.card-title {
  font-size: var(--text-lg);
  font-weight: var(--weight-semibold);
  line-height: var(--leading-tight);
  color: var(--color-text);
  letter-spacing: -0.01em;
}

/* Wide tables scroll inside their card, not the page. */
.table-container {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

thead {
  background: var(--color-surface-muted);
}

th {
  position: sticky;
  top: 0;
  background: var(--color-surface-muted);
  text-align: left;
  padding: var(--space-3) var(--space-4);
  font-weight: var(--weight-semibold);
  /* Secondary, not muted: muted text on the muted header fill is 4.34:1, under WCAG AA. */
  color: var(--color-text-secondary);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
  border-bottom: 1px solid var(--color-border);
}

td {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  font-variant-numeric: tabular-nums;
}

td:first-child {
  color: var(--color-text);
  font-weight: var(--weight-medium);
}

tbody tr:last-child td {
  border-bottom: none;
}

tbody tr {
  transition: background-color var(--transition);
}

tbody tr:hover {
  background: var(--color-surface-muted);
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 2px var(--space-2);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  line-height: var(--leading-normal);
  white-space: nowrap;
  background: var(--color-surface-muted);
  color: var(--color-text-secondary);
}

/* Leading status dot in the badge's text color. */
.badge::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
}

/* Variant map: success/increasing -> success, warning/medium -> warning,
   danger/decreasing/high -> danger, info/low -> info, stable -> neutral. */
.badge.success,
.badge.increasing {
  background: var(--color-success-soft);
  color: var(--color-success);
}

.badge.warning,
.badge.medium {
  background: var(--color-warning-soft);
  color: var(--color-warning);
}

.badge.danger,
.badge.decreasing,
.badge.high {
  background: var(--color-danger-soft);
  color: var(--color-danger);
}

.badge.info,
.badge.low {
  background: var(--color-info-soft);
  color: var(--color-info);
}

.badge.stable {
  background: var(--color-surface-muted);
  color: var(--color-text-secondary);
}

.loading {
  text-align: center;
  padding: var(--space-12) var(--space-4);
  color: var(--color-text-muted);
  font-size: var(--text-sm);
}

.error {
  background: var(--color-danger-soft);
  /* Danger-tinted border derived from the danger token. */
  border: 1px solid color-mix(in srgb, var(--color-danger) 25%, transparent);
  color: var(--color-danger);
  padding: var(--space-4);
  border-radius: var(--radius-md);
  margin: var(--space-4) 0;
  font-size: var(--text-sm);
}
</style>
