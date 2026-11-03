<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen && product" class="modal-overlay" @click="close">
        <div class="modal-container" @click.stop>
          <div class="modal-header">
            <h3 class="modal-title">Product Details</h3>
            <button class="close-button" aria-label="Close" @click="close">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>

          <div class="modal-body">
            <div class="product-header">
              <div class="product-icon">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <rect x="8" y="12" width="32" height="28" rx="2" stroke="currentColor" stroke-width="2.5"/>
                  <path d="M16 8V16M32 8V16M8 20H40" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
                </svg>
              </div>
              <div class="product-title-section">
                <h4 class="product-name">{{ product.name }}</h4>
                <div class="product-sku">SKU: {{ product.sku }}</div>
              </div>
              <span class="badge stock-badge" :class="getStockBadgeClass(product.stockLevel)">
                {{ product.stockLevel }}
              </span>
            </div>

            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Category</div>
                <div class="info-value">{{ product.category }}</div>
              </div>

              <div class="info-item">
                <div class="info-label">Warehouse</div>
                <div class="info-value">{{ product.warehouse }}</div>
              </div>

              <div class="info-item">
                <div class="info-label">Units Ordered</div>
                <div class="info-value">{{ product.unitsOrdered }}</div>
              </div>

              <div class="info-item">
                <div class="info-label">Total Revenue</div>
                <div class="info-value">{{ formatCurrencyWithDecimals(product.revenue, currentCurrency, 2) }}</div>
              </div>

              <div class="info-item">
                <div class="info-label">Current Stock</div>
                <div class="info-value">{{ product.quantityOnHand }} units</div>
              </div>

              <div class="info-item">
                <div class="info-label">Reorder Point</div>
                <div class="info-value">{{ product.reorderPoint }} units</div>
              </div>

              <div class="info-item">
                <div class="info-label">First Order Date</div>
                <div class="info-value">{{ formatDate(product.firstOrderDate) }}</div>
              </div>

              <div class="info-item">
                <div class="info-label">Stock Status</div>
                <div class="info-value">
                  <span :class="['badge', getStockBadgeClass(product.stockLevel)]">
                    {{ product.stockLevel }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-secondary" @click="close">Close</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from '../composables/useI18n'
import { formatCurrencyWithDecimals } from '../utils/currency'

const { currentCurrency } = useI18n()

const currencySymbol = computed(() => {
  return currentCurrency.value === 'JPY' ? '¥' : '$'
})

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  product: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close'])

const close = () => {
  emit('close')
}

const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const getStockBadgeClass = (stockLevel) => {
  if (stockLevel === 'In Stock') return 'success'
  if (stockLevel === 'Low Stock') return 'warning'
  if (stockLevel === 'Out of Stock') return 'danger'
  return 'info'
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

/* Entity header: icon chip, name + SKU, status badge. */
.product-header {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-4);
  padding-bottom: var(--space-5);
  margin-bottom: var(--space-5);
  border-bottom: 1px solid var(--color-border);
}

.product-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: var(--space-12);
  height: var(--space-12);
  border-radius: var(--radius-lg);
}

.product-icon svg {
  width: 28px;
  height: 28px;
}

.product-title-section {
  flex: 1;
  min-width: 0;
}

.product-name {
  margin-bottom: var(--space-1);
  font-size: var(--text-xl);
  font-weight: var(--weight-bold);
  line-height: var(--leading-tight);
  letter-spacing: -0.02em;
  color: var(--color-text);
  overflow-wrap: anywhere;
}

.product-sku {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.product-icon {
  background: var(--color-info-soft);
  color: var(--color-info);
}

/* Global .badge supplies the success/warning/danger/info colors. */
.stock-badge {
  flex-shrink: 0;
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

@media (max-width: 767px) {
  /* Long product names wrapped to three lines at --text-xl on phones. */
  .product-name {
    font-size: var(--text-lg);
  }
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
