<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="modal-overlay" @click="close">
        <div class="modal-container tasks-modal-container" @click.stop>
          <div class="modal-header">
            <h3 class="modal-title">{{ t('tasks.title') }}</h3>
            <button class="close-button" :aria-label="t('profileDetails.close')" @click="close">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>

          <div class="modal-body">
            <!-- Add Task Form -->
            <div class="task-form">
              <div class="form-row">
                <div class="form-group flex-1">
                  <label for="task-title">{{ t('tasks.taskTitle') }}</label>
                  <input
                    id="task-title"
                    v-model="newTask.title"
                    type="text"
                    :placeholder="t('tasks.taskTitlePlaceholder')"
                    class="task-input"
                    @keyup.enter="handleAddTask"
                  />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="task-priority">{{ t('tasks.priority') }}</label>
                  <select
                    id="task-priority"
                    v-model="newTask.priority"
                    class="task-select"
                  >
                    <option value="high">{{ t('priority.high') }}</option>
                    <option value="medium">{{ t('priority.medium') }}</option>
                    <option value="low">{{ t('priority.low') }}</option>
                  </select>
                </div>

                <div class="form-group">
                  <label for="task-due-date">{{ t('tasks.dueDate') }}</label>
                  <input
                    id="task-due-date"
                    v-model="newTask.dueDate"
                    type="date"
                    class="task-input"
                  />
                </div>

                <div class="form-group-btn">
                  <button @click="handleAddTask" class="task-add-btn" :disabled="!newTask.title.trim() || !newTask.dueDate">
                    {{ t('tasks.addTask') }}
                  </button>
                </div>
              </div>
            </div>

            <div class="tasks-divider"></div>

            <!-- Tasks List -->
            <div v-if="sortedTasks.length === 0" class="no-tasks">
              {{ t('tasks.noTasks') }}
            </div>

            <div v-else class="tasks-list">
              <div
                v-for="task in sortedTasks"
                :key="task.id"
                class="task-item"
                :class="[`priority-${task.priority}`, { completed: task.status === 'completed' }]"
              >
                <div class="task-header">
                  <div class="task-check-title">
                    <input
                      type="checkbox"
                      :checked="task.status === 'completed'"
                      @change="$emit('toggle-task', task.id)"
                      class="task-checkbox"
                      :aria-label="task.title"
                    />
                    <span class="task-title" @click="$emit('toggle-task', task.id)">{{ task.title }}</span>
                  </div>
                  <button @click="$emit('delete-task', task.id)" class="task-delete-btn" title="Delete task" aria-label="Delete task">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M3 6h18" />
                      <path d="M8 6V4h8v2" />
                      <path d="M19 6l-1 14H6L5 6" />
                      <path d="M10 11v6M14 11v6" />
                    </svg>
                  </button>
                </div>

                <div class="task-footer">
                  <span class="badge priority-badge" :class="task.priority">
                    {{ translatePriority(task.priority) }}
                  </span>
                  <div class="task-due-date">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <rect x="2" y="3" width="10" height="9" rx="1" stroke="currentColor" stroke-width="1.2"/>
                      <path d="M4.5 1.5V4.5M9.5 1.5V4.5M2 6H12" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
                    </svg>
                    {{ formatDueDate(task.dueDate) }}
                  </div>
                  <span class="badge status-badge" :class="getStatusClass(task.dueDate, task.status)">
                    {{ getStatusText(task.dueDate, task.status) }}
                  </span>
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

<script>
import { ref, computed } from 'vue'
import { useI18n } from '../composables/useI18n'

export default {
  name: 'TasksModal',
  props: {
    isOpen: {
      type: Boolean,
      required: true
    },
    tasks: {
      type: Array,
      default: () => []
    }
  },
  emits: ['close', 'add-task', 'delete-task', 'toggle-task'],
  setup(props, { emit }) {
    const { t, currentLocale } = useI18n()
    const newTask = ref({
      title: '',
      priority: 'medium',
      dueDate: ''
    })

    const sortedTasks = computed(() => {
      // Don't sort - just return tasks in their current order (newest first)
      return [...props.tasks]
    })

    const close = () => {
      emit('close')
    }

    const handleAddTask = () => {
      if (newTask.value.title.trim() && newTask.value.dueDate) {
        emit('add-task', {
          title: newTask.value.title.trim(),
          priority: newTask.value.priority,
          dueDate: newTask.value.dueDate
        })
        newTask.value = {
          title: '',
          priority: 'medium',
          dueDate: ''
        }
      }
    }

    const formatDueDate = (dateString) => {
      const date = new Date(dateString)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const dueDate = new Date(date)
      dueDate.setHours(0, 0, 0, 0)

      const diffTime = dueDate - today
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      const isJapanese = currentLocale.value === 'ja'

      if (diffDays === 0) return isJapanese ? '今日' : 'today'
      if (diffDays === 1) return isJapanese ? '明日' : 'tomorrow'
      if (diffDays === -1) return isJapanese ? '昨日' : 'yesterday'
      if (diffDays < 0) return isJapanese ? `${Math.abs(diffDays)}日前` : `${Math.abs(diffDays)} days ago`
      if (diffDays < 7) return isJapanese ? `${diffDays}日後` : `in ${diffDays} days`

      const locale = isJapanese ? 'ja-JP' : 'en-US'
      return date.toLocaleDateString(locale, {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      })
    }

    const getStatusClass = (dueDate, status) => {
      if (status === 'completed') return 'completed'

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const due = new Date(dueDate)
      due.setHours(0, 0, 0, 0)

      const diffTime = due - today
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      if (diffDays < 0) return 'overdue'
      if (diffDays <= 1) return 'urgent'
      return 'upcoming'
    }

    const getStatusText = (dueDate, status) => {
      const isJapanese = currentLocale.value === 'ja'

      if (status === 'completed') return isJapanese ? '完了' : 'Completed'

      const statusClass = getStatusClass(dueDate, status)
      if (statusClass === 'overdue') return isJapanese ? '期限超過' : 'Overdue'
      if (statusClass === 'urgent') return isJapanese ? 'もうすぐ期限' : 'Due Soon'
      return isJapanese ? '予定' : 'Upcoming'
    }

    const translatePriority = (priority) => {
      const priorityMap = {
        'high': t('priority.high'),
        'medium': t('priority.medium'),
        'low': t('priority.low')
      }
      return priorityMap[priority] || priority
    }

    return {
      t,
      newTask,
      sortedTasks,
      close,
      handleAddTask,
      formatDueDate,
      getStatusClass,
      getStatusText,
      translatePriority
    }
  }
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
  max-width: 640px;
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

.tasks-modal-container {
  max-width: 720px;
}

/* Add-task form: a muted panel holding standard 36px controls. */
.task-form {
  padding: var(--space-4);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.form-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}

.form-row:last-child {
  margin-bottom: 0;
}

.form-group {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.form-group.flex-1 {
  flex: 1;
}

.form-group-btn {
  display: flex;
  align-items: flex-end;
}

.form-group label {
  margin-bottom: var(--space-1);
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  color: var(--color-text-secondary);
}

.task-input,
.task-select {
  width: 100%;
  height: 36px;
  padding: 0 var(--space-3);
  /* background-color, not the shorthand: the shorthand would reset the
     global select chevron (background-image) defined in App.vue. */
  background-color: var(--color-surface);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-sm);
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--color-text);
  transition: border-color var(--transition), box-shadow var(--transition);
}

.task-input::placeholder {
  color: var(--color-text-muted);
}

.task-input:focus,
.task-select:focus {
  outline: none;
  border-color: var(--color-focus);
  box-shadow: 0 0 0 3px var(--color-accent-soft);
}

.task-select {
  cursor: pointer;
}

/* Primary button. */
.task-add-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  height: 36px;
  padding: 0 var(--space-4);
  background: var(--color-accent);
  border: none;
  border-radius: var(--radius-md);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: #ffffff;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color var(--transition);
}

.task-add-btn:hover:not(:disabled) {
  background: var(--color-accent-hover);
}

.task-add-btn:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

.task-add-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tasks-divider {
  height: 1px;
  margin: var(--space-6) 0;
  background: var(--color-border);
}

/* Empty state. */
.no-tasks {
  padding: var(--space-10) var(--space-4);
  text-align: center;
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.tasks-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.task-item {
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: border-color var(--transition), box-shadow var(--transition);
}

.task-item:hover {
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-sm);
}

/* Priority rail: high danger, medium warning, low info. */
.task-item.priority-high {
  border-left: 3px solid var(--color-danger);
}

.task-item.priority-medium {
  border-left: 3px solid var(--color-warning);
}

.task-item.priority-low {
  border-left: 3px solid var(--color-info);
}

.task-item.completed {
  opacity: 0.7;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
}

.task-check-title {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  flex: 1;
  min-width: 0;
}

/* Checkbox width is reused by .task-footer's indent so meta lines up with the title. */
.task-checkbox {
  flex-shrink: 0;
  width: var(--space-4);
  height: var(--space-4);
  /* Centers the box on the title's first line (line-height minus box size). */
  margin-top: calc((var(--text-sm) * var(--leading-normal) - var(--space-4)) / 2);
  accent-color: var(--color-accent);
  cursor: pointer;
}

.task-checkbox:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

.task-title {
  flex: 1;
  min-width: 0;
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  line-height: var(--leading-normal);
  color: var(--color-text);
  cursor: pointer;
  user-select: none;
  overflow-wrap: anywhere;
}

.task-item.completed .task-title {
  text-decoration: line-through;
  color: var(--color-text-muted);
}

/* Ghost icon button with a danger hover. */
.task-delete-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
  cursor: pointer;
  transition: background-color var(--transition), color var(--transition);
}

.task-delete-btn:hover {
  background: var(--color-danger-soft);
  color: var(--color-danger);
}

.task-delete-btn:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

.task-footer {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-3);
  padding-left: calc(var(--space-4) + var(--space-3));
}

/* Global .badge supplies high/medium/low -> danger/warning/info. */
.priority-badge {
  flex-shrink: 0;
}

.task-due-date {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.task-due-date svg {
  color: var(--color-text-muted);
}

/* Due-state badge (base look from global .badge) mapped onto status pairs. */
.status-badge {
  margin-left: auto;
}

.status-badge.overdue {
  background: var(--color-danger-soft);
  color: var(--color-danger);
}

.status-badge.urgent {
  background: var(--color-warning-soft);
  color: var(--color-warning);
}

.status-badge.upcoming {
  background: var(--color-info-soft);
  color: var(--color-info);
}

.status-badge.completed {
  background: var(--color-success-soft);
  color: var(--color-success);
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

  .form-row {
    flex-direction: column;
  }

  .form-group-btn,
  .task-add-btn {
    width: 100%;
  }

  .task-footer {
    padding-left: 0;
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
