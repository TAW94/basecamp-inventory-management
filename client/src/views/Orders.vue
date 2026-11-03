<template>
  <div class="orders">
    <div class="page-header">
      <h2>{{ t('orders.title') }}</h2>
      <p>{{ t('orders.description') }}</p>
    </div>

    <div v-if="loading" class="loading">{{ t('common.loading') }}</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else>
      <div class="stats-grid">
        <div class="stat-card success">
          <div class="stat-label">{{ t('status.delivered') }}</div>
          <div class="stat-value">{{ getOrdersByStatus('Delivered').length }}</div>
        </div>
        <div class="stat-card info">
          <div class="stat-label">{{ t('status.shipped') }}</div>
          <div class="stat-value">{{ getOrdersByStatus('Shipped').length }}</div>
        </div>
        <div class="stat-card warning">
          <div class="stat-label">{{ t('status.processing') }}</div>
          <div class="stat-value">{{ getOrdersByStatus('Processing').length }}</div>
        </div>
        <div class="stat-card danger">
          <div class="stat-label">{{ t('status.backordered') }}</div>
          <div class="stat-value">{{ getOrdersByStatus('Backordered').length }}</div>
        </div>
      </div>

      <!-- Restocking orders are independent of the global filter bar (they are not warehouse/category/month scoped) -->
      <div class="card submitted-card">
        <div class="card-header">
          <h3 class="card-title">{{ t('orders.submittedOrders') }} ({{ restockingOrders.length }})</h3>
          <p class="card-hint">{{ t('orders.submittedOrdersHint') }}</p>
        </div>
        <div v-if="restockingError" class="error">{{ restockingError }}</div>
        <div v-else-if="restockingOrders.length === 0" class="empty-state">
          <p>{{ t('orders.noSubmittedOrders') }}</p>
          <router-link to="/restocking">{{ t('orders.createRestockingOrder') }}</router-link>
        </div>
        <div v-else class="table-container">
          <table>
            <thead>
              <tr>
                <th>{{ t('orders.table.orderNumber') }}</th>
                <th class="num">{{ t('orders.submittedDate') }}</th>
                <th>{{ t('orders.table.items') }}</th>
                <th class="num">{{ t('orders.table.totalValue') }}</th>
                <th class="num">{{ t('orders.leadTime') }}</th>
                <th class="num">{{ t('orders.table.expectedDelivery') }}</th>
                <th>{{ t('orders.table.status') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="order in restockingOrders" :key="order.id">
                <td class="nowrap"><strong>{{ order.order_number }}</strong></td>
                <td class="num">{{ formatDate(order.submitted_date) }}</td>
                <td class="nowrap">{{ tc('orders.itemsCount', order.items.length) }}</td>
                <td class="num"><strong>{{ formatCurrencyWithDecimals(order.total_cost, currentCurrency, 2) }}</strong></td>
                <td class="num">{{ t('orders.daysCount', { count: order.lead_time_days }) }}</td>
                <td class="num">{{ formatDate(order.expected_delivery) }}</td>
                <td>
                  <span class="badge info">{{ submittedStatusLabel(order.status) }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">{{ t('orders.allOrders') }} ({{ orders.length }})</h3>
        </div>
        <div class="table-container">
          <table class="orders-table">
            <thead>
              <tr>
                <th class="col-order-number">{{ t('orders.table.orderNumber') }}</th>
                <th class="col-customer">{{ t('orders.table.customer') }}</th>
                <th class="col-items">{{ t('orders.table.items') }}</th>
                <th class="col-status">{{ t('orders.table.status') }}</th>
                <th class="col-date num">{{ t('orders.table.orderDate') }}</th>
                <th class="col-date num">{{ t('orders.table.expectedDelivery') }}</th>
                <th class="col-value num">{{ t('orders.table.totalValue') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="order in orders" :key="order.id">
                <td class="col-order-number nowrap"><strong>{{ order.order_number }}</strong></td>
                <td class="col-customer">{{ translateCustomerName(order.customer) }}</td>
                <td class="col-items">
                  <details class="items-details">
                    <summary class="items-summary">
                      {{ tc('orders.itemsCount', order.items.length) }}
                    </summary>
                    <div class="items-dropdown">
                      <div v-for="(item, idx) in order.items" :key="idx" class="item-entry">
                        <span class="item-name">{{ translateProductName(item.name) }}</span>
                        <span class="item-meta">{{ t('orders.quantity') }}: {{ item.quantity }} @ {{ formatCurrencyWithDecimals(item.unit_price, currentCurrency, 2) }}</span>
                      </div>
                    </div>
                  </details>
                </td>
                <td class="col-status">
                  <span :class="['badge', getOrderStatusClass(order.status)]">
                    {{ t(`status.${order.status.toLowerCase()}`) }}
                  </span>
                </td>
                <td class="col-date num">{{ formatDate(order.order_date) }}</td>
                <td class="col-date num">{{ formatDate(order.expected_delivery) }}</td>
                <td class="col-value num"><strong>{{ formatCurrencyWithDecimals(order.total_value, currentCurrency, 2) }}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, watch, computed } from 'vue'
import { api } from '../api'
import { useFilters } from '../composables/useFilters'
import { useI18n } from '../composables/useI18n'
import { formatCurrencyWithDecimals } from '../utils/currency'

export default {
  name: 'Orders',
  setup() {
    const { t, tc, currentCurrency, translateProductName, translateCustomerName } = useI18n()

    const currencySymbol = computed(() => {
      return currentCurrency.value === 'JPY' ? '¥' : '$'
    })
    const loading = ref(true)
    const error = ref(null)
    const orders = ref([])
    const restockingOrders = ref([])
    const restockingError = ref(null)

    // Use shared filters
    const {
      selectedPeriod,
      selectedLocation,
      selectedCategory,
      selectedStatus,
      getCurrentFilters
    } = useFilters()

    const loadOrders = async () => {
      try {
        loading.value = true
        const filters = getCurrentFilters()
        const fetchedOrders = await api.getOrders(filters)

        // Sort orders by order_date (earliest first)
        orders.value = fetchedOrders.sort((a, b) => {
          const dateA = new Date(a.order_date)
          const dateB = new Date(b.order_date)
          return dateA - dateB
        })
      } catch (err) {
        error.value = 'Failed to load orders: ' + err.message
      } finally {
        loading.value = false
      }
    }

    // Restocking orders ignore the global filters, so they are fetched once on mount rather than in
    // loadOrders (which re-runs on every filter change). A failure here is captured separately
    // so it never breaks the main orders list.
    const loadRestockingOrders = async () => {
      try {
        restockingOrders.value = await api.getRestockingOrders()
        restockingError.value = null
      } catch (err) {
        console.error('Failed to load restocking orders:', err)
        restockingError.value = t('orders.submittedLoadFailed')
      }
    }

    // Watch for filter changes and reload data
    watch([selectedPeriod, selectedLocation, selectedCategory, selectedStatus], () => {
      loadOrders()
    })

    const getOrdersByStatus = (status) => {
      return orders.value.filter(order => order.status === status)
    }

    const getOrderStatusClass = (status) => {
      const statusMap = {
        'Delivered': 'success',
        'Shipped': 'info',
        'Processing': 'warning',
        'Backordered': 'danger'
      }
      return statusMap[status] || 'info'
    }

    // Known restocking statuses are translated; unknown ones fall back to the raw server value
    const submittedStatusLabel = (status) => (status === 'Submitted' ? t('status.submitted') : status)

    const formatDate = (dateString) => {
      const { currentLocale } = useI18n()
      // Guard against missing/invalid dates so we never render "Invalid Date"
      if (!dateString || isNaN(new Date(dateString).getTime())) return '-'
      const locale = currentLocale.value === 'ja' ? 'ja-JP' : 'en-US'
      return new Date(dateString).toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    }

    onMounted(() => {
      loadOrders()
      loadRestockingOrders()
    })

    return {
      t,
      tc,
      loading,
      error,
      orders,
      restockingOrders,
      restockingError,
      currentCurrency,
      formatCurrencyWithDecimals,
      getOrdersByStatus,
      submittedStatusLabel,
      getOrderStatusClass,
      formatDate,
      currencySymbol,
      translateProductName,
      translateCustomerName
    }
  }
}
</script>

<style scoped>
/* Two stat cards per row on phones instead of four full-width rows. */
@media (max-width: 767px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-3);
  }
}

/* Title and hint share the header row and wrap on narrow screens. */
.card-header {
  flex-wrap: wrap;
}

.card-hint {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-8) var(--space-4);
  text-align: center;
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.empty-state a {
  color: var(--color-accent);
  font-weight: var(--weight-medium);
}

.empty-state a:hover {
  color: var(--color-accent-hover);
}

/* Fixed table layout to prevent column shifting */
.orders-table {
  table-layout: fixed;
  width: 100%;
}

/* Column widths (table geometry; the container scrolls when they exceed the card) */
.col-order-number {
  width: 130px;
}

.col-customer {
  width: 180px;
}

.col-items {
  width: 200px;
}

.col-status {
  width: 130px;
}

.col-date {
  width: 140px;
}

.col-value {
  width: 120px;
}

/* Numeric, currency and date columns: right-aligned with tabular figures */
.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* Headers in fixed-width columns may wrap ("Expected Delivery" was clipped at 140px); body cells stay on one line */
.orders-table th {
  white-space: normal;
  overflow-wrap: anywhere;
}

/* Order numbers stay on one line */
.nowrap {
  white-space: nowrap;
}

/* Items details styling */
.items-details {
  position: relative;
}

.items-summary {
  cursor: pointer;
  color: var(--color-accent);
  font-weight: var(--weight-medium);
  list-style: none;
  user-select: none;
  display: inline-block;
}

.items-summary::-webkit-details-marker {
  display: none;
}

.items-summary::before {
  content: '\25B6';
  display: inline-block;
  margin-right: var(--space-1);
  font-size: var(--text-xs);
  transition: transform var(--transition);
}

.items-details[open] .items-summary::before {
  transform: rotate(90deg);
}

.items-summary:hover {
  color: var(--color-accent-hover);
  text-decoration: underline;
}

.items-summary:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}

/* Dropdown container */
.items-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: var(--space-2);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: var(--space-1);
  z-index: var(--z-dropdown);
  min-width: 300px;
  max-width: 400px;
}

.item-entry {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-border);
}

.item-entry:last-child {
  border-bottom: none;
}

.item-name {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--color-text);
}

.item-meta {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}
</style>
