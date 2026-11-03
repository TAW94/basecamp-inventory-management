<template>
  <button
    type="button"
    class="theme-button"
    :aria-label="t('theme.dark')"
    :aria-pressed="isDark"
    :title="isDark ? t('theme.switchToLight') : t('theme.switchToDark')"
    @click="toggleTheme"
  >
    <!-- Moon while light, sun while dark: the icon shows the current theme. -->
    <svg v-if="isDark" class="theme-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="3.5" stroke="currentColor" stroke-width="1.5" />
      <path
        d="M10 2.5V4.5M10 15.5V17.5M2.5 10H4.5M15.5 10H17.5M4.7 4.7L6.1 6.1M13.9 13.9L15.3 15.3M4.7 15.3L6.1 13.9M13.9 6.1L15.3 4.7"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
      />
    </svg>
    <svg v-else class="theme-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M16.5 11.5A6.5 6.5 0 0 1 8.5 3.5a6.5 6.5 0 1 0 8 8Z"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linejoin="round"
      />
    </svg>
    <span class="theme-label">{{ t('theme.dark') }}</span>
  </button>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from '../composables/useI18n'
import { useTheme } from '../composables/useTheme'

const { t } = useI18n()
const { theme, toggleTheme } = useTheme()

const isDark = computed(() => theme.value === 'dark')
</script>

<style scoped>
/* Full-width ghost button in the sidebar footer; mirrors LanguageSwitcher. */
.theme-button {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  height: 40px;
  padding: 0 var(--space-3);
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition:
    background var(--transition),
    color var(--transition);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--color-text-secondary);
  text-align: left;
}

.theme-button:hover {
  background: var(--color-surface-muted);
  color: var(--color-text);
}

.theme-button:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

.theme-icon {
  color: var(--color-text-muted);
  flex-shrink: 0;
}

/* AppSidebar hides this label in the collapsed rail (icon-only). */
.theme-label {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
}
</style>
