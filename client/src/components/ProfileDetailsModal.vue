<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="modal-overlay" @click="close">
        <div class="modal-container" @click.stop>
          <div class="modal-header">
            <h3 class="modal-title">{{ t('profileDetails.title') }}</h3>
            <button class="close-button" :aria-label="t('profileDetails.close')" @click="close">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>

          <div class="modal-body">
            <div class="profile-section">
              <div class="avatar-section">
                <div class="avatar-xl">
                  {{ getInitials(currentUser.name) }}
                </div>
                <h4 class="profile-name">{{ currentUser.name }}</h4>
                <p class="profile-job-title">{{ currentUser.jobTitle }}</p>
              </div>

              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">{{ t('profileDetails.email') }}</div>
                  <div class="info-value">{{ currentUser.email }}</div>
                </div>

                <div class="info-item">
                  <div class="info-label">{{ t('profileDetails.department') }}</div>
                  <div class="info-value">{{ currentUser.department }}</div>
                </div>

                <div class="info-item">
                  <div class="info-label">{{ t('profileDetails.location') }}</div>
                  <div class="info-value">{{ currentUser.location }}</div>
                </div>

                <div class="info-item">
                  <div class="info-label">{{ t('profileDetails.phone') }}</div>
                  <div class="info-value">{{ currentUser.phone }}</div>
                </div>

                <div class="info-item">
                  <div class="info-label">{{ t('profileDetails.joinDate') }}</div>
                  <div class="info-value">{{ formatDate(currentUser.joinDate) }}</div>
                </div>

                <div class="info-item">
                  <div class="info-label">{{ t('profileDetails.employeeId') }}</div>
                  <div class="info-value">CC-{{ currentUser.id.toString().padStart(5, '0') }}</div>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-secondary" @click="close">{{ t('profileDetails.close') }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { useAuth } from '../composables/useAuth'
import { useI18n } from '../composables/useI18n'

const { currentUser, getInitials } = useAuth()
const { t, currentLocale } = useI18n()

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

const close = () => {
  emit('close')
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  const locale = currentLocale.value === 'ja' ? 'ja-JP' : 'en-US'
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}
</script>

<style scoped>
/* ==========================================================================
   Modal shell (component-polish.md > Modals). Every *Modal.vue carries the
   same block because the styles are scoped; keep them in sync.
   ========================================================================== */
.modal-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-6);
  background: rgba(15, 23, 42, 0.45);
  /* Above topbar (50), sidebar (60), dropdowns (100) and drawer overlay (200). */
  z-index: var(--z-modal);
}

.modal-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 560px;
  /* Equals the overlay's space-6 inset top + bottom; the body scrolls. */
  max-height: calc(100vh - var(--space-12));
  overflow: hidden;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  flex-shrink: 0;
  padding: var(--space-5) var(--space-6);
  border-bottom: 1px solid var(--color-border);
}

.modal-title {
  min-width: 0;
  font-size: var(--text-lg);
  font-weight: var(--weight-semibold);
  line-height: var(--leading-tight);
  letter-spacing: -0.01em;
  color: var(--color-text);
}

/* Ghost icon button. The negative margin lines the glyph up with the
   header's right padding edge instead of the button's hit area. */
.close-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  margin-right: calc(-1 * var(--space-2));
  padding: 0;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: background-color var(--transition), color var(--transition);
}

.close-button:hover {
  background: var(--color-surface-muted);
  color: var(--color-text);
}

.close-button:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

.modal-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: var(--space-6);
}

/* Buttons right-aligned, primary last. */
.modal-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: var(--space-3);
  flex-shrink: 0;
  padding: var(--space-5) var(--space-6);
  border-top: 1px solid var(--color-border);
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  height: 36px;
  padding: 0 var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--color-text);
  cursor: pointer;
  transition: background-color var(--transition);
}

.btn-secondary:hover {
  background: var(--color-surface-muted);
}

.btn-secondary:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

.profile-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  padding-bottom: var(--space-6);
  border-bottom: 1px solid var(--color-border);
  text-align: center;
}

.avatar-xl {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  margin-bottom: var(--space-2);
  border-radius: 50%;
  background: var(--color-accent);
  color: #ffffff;
  font-size: var(--text-2xl);
  font-weight: var(--weight-bold);
  letter-spacing: 0.02em;
}

.profile-name {
  font-size: var(--text-xl);
  font-weight: var(--weight-bold);
  line-height: var(--leading-tight);
  letter-spacing: -0.02em;
  color: var(--color-text);
}

.profile-job-title {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

/* Info grid: two columns of label/value pairs; one column on mobile. */
.info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-5) var(--space-6);
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.info-label {
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
}

.info-value {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--color-text);
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}

/* Mobile: near-full-width panel with a space-4 margin. */
@media (max-width: 767px) {
  .modal-overlay {
    padding: var(--space-4);
  }

  .modal-container {
    max-height: calc(100vh - var(--space-8));
    max-height: calc(100dvh - var(--space-8));
  }

  .modal-header,
  .modal-footer {
    padding: var(--space-4) var(--space-5);
  }

  .modal-body {
    padding: var(--space-5);
  }

  .info-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-4);
  }
}

/* Modal transition animations */
.modal-enter-active,
.modal-leave-active {
  transition: opacity var(--transition);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: transform var(--transition);
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.95);
}

@media (prefers-reduced-motion: reduce) {
  .modal-enter-active .modal-container,
  .modal-leave-active .modal-container {
    transition: none;
  }

  .modal-enter-from .modal-container,
  .modal-leave-to .modal-container {
    transform: none;
  }
}
</style>
