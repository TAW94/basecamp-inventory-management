<template>
  <div class="restocking">
    <div class="page-header">
      <h2>{{ t('restocking.title') }}</h2>
      <p>{{ t('restocking.description') }}</p>
    </div>

    <div v-if="loading" class="loading">{{ t('common.loading') }}</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else>
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">{{ t('restocking.budget') }}: {{ formatCurrency(budget, currentCurrency) }}</h3>
        </div>
        <div class="budget-body">
          <input
            v-model.number="budget"
            type="range"
            min="0"
            :max="maxBudget"
            :step="BUDGET_STEP"
            class="budget-slider"
            :aria-label="t('restocking.budget')"
          />
          <div class="budget-hint">
            {{ t('restocking.budgetHint', { max: formatCurrency(maxBudget, currentCurrency) }) }}
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">{{ t('restocking.recommendations') }}</h3>
        </div>
        <div v-if="rows.length === 0" class="empty-state">{{ t('restocking.noShortfall') }}</div>
        <div v-else class="table-container">
          <table>
            <thead>
              <tr>
                <th>{{ t('restocking.table.include') }}</th>
                <th>{{ t('restocking.table.sku') }}</th>
                <th>{{ t('restocking.table.itemName') }}</th>
                <th>{{ t('restocking.table.trend') }}</th>
                <th class="num">{{ t('restocking.table.shortfall') }}</th>
                <th class="num">{{ t('restocking.table.quantity') }}</th>
                <th class="num">{{ t('restocking.table.unitCost') }}</th>
                <th class="num">{{ t('restocking.table.lineTotal') }}</th>
                <th class="num">{{ t('restocking.table.leadTime') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in rows" :key="row.id" :class="{ muted: !row.included || row.quantity === 0, 'zero-qty': row.quantity === 0 }">
                <td class="include-cell">
                  <input
                    type="checkbox"
                    :checked="row.included"
                    :aria-label="row.item_sku"
                    @change="toggleItem(row.item_sku)"
                  />
                </td>
                <td class="nowrap"><strong>{{ row.item_sku }}</strong></td>
                <td>{{ row.item_name }}</td>
                <td>
                  <span :class="['badge', row.trend]">{{ t(`trends.${row.trend}`) }}</span>
                </td>
                <td class="num">{{ row.shortfall }}</td>
                <td class="num">
                  <span v-if="row.quantity > 0 && row.quantity < row.shortfall" class="badge warning partial-tag">
                    {{ t('restocking.partial') }}
                  </span>
                  <strong>{{ row.quantity }}</strong>
                </td>
                <td class="num">{{ formatCurrencyWithDecimals(row.unit_cost, currentCurrency, 2) }}</td>
                <td class="num">{{ formatCurrencyWithDecimals(row.quantity * row.unit_cost, currentCurrency, 2) }}</td>
                <td class="num">{{ row.lead_time_days }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="summary">
          <div class="summary-item">
            <span class="summary-label">{{ t('restocking.summary.orderTotal') }}</span>
            <span class="summary-value">{{ formatCurrencyWithDecimals(orderTotal, currentCurrency, 2) }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">{{ t('restocking.summary.remainingBudget') }}</span>
            <span class="summary-value">{{ formatCurrencyWithDecimals(remainingBudget, currentCurrency, 2) }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">{{ t('restocking.summary.leadTime') }}</span>
            <span class="summary-value">{{ t('restocking.summary.days', { count: orderLeadTime }) }}</span>
          </div>
          <button class="place-order-btn" :disabled="!canSubmit" @click="placeOrder">
            {{ submitting ? t('restocking.submitting') : t('restocking.placeOrder') }}
          </button>
        </div>
      </div>

      <div v-if="submitError" class="error submit-feedback">{{ submitError }}</div>
      <div v-if="confirmation" class="confirmation">
        <strong>{{ t('restocking.confirmation.title') }}</strong>
        <div>{{ t('restocking.confirmation.orderNumber') }}: {{ confirmation.order_number }}</div>
        <div>{{ t('restocking.confirmation.expectedDelivery') }}: {{ formatDate(confirmation.expected_delivery) }}</div>
        <router-link to="/orders">{{ t('restocking.confirmation.viewOrders') }}</router-link>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue'
import { api } from '../api'
import { useI18n } from '../composables/useI18n'
import { formatCurrency, formatCurrencyWithDecimals } from '../utils/currency'

const BUDGET_STEP = 500
const BUDGET_MAX_ROUNDING = 1000

// All allocation maths runs in integer cents: float drift (e.g. 3.2 * 100 = 320.00000000000006,
// or 12.4 * 3 vs. a remaining budget) can make a unit silently vanish or overshoot the budget.
const toCents = (usd) => Math.round(usd * 100)
const fromCents = (cents) => cents / 100

export default {
  name: 'Restocking',
  setup() {
    const { t, currentCurrency, currentLocale } = useI18n()

    const loading = ref(true)
    const error = ref(null)
    // Raw data; everything else is derived via computed properties
    const forecasts = ref([])
    // SKUs the user has unticked (replaced, never mutated, to keep reactivity simple)
    const excludedSkus = ref(new Set())
    // Budget is always held in USD (the API currency); display converts via formatCurrency
    const budget = ref(0)
    const submitting = ref(false)
    const submitError = ref(null)
    const confirmation = ref(null)

    // Same formula as getChangePercent in Demand.vue, but numeric (no formatting).
    // A zero baseline with positive forecast is treated as unbounded growth.
    const growthPercent = (f) => {
      if (f.current_demand === 0) return f.forecasted_demand > 0 ? Infinity : 0
      return (f.forecasted_demand - f.current_demand) / f.current_demand * 100
    }

    // Candidates: items whose forecast exceeds current demand, in priority order.
    const candidates = computed(() => {
      const trendRank = { increasing: 0, stable: 1 }
      return forecasts.value
        .map(f => ({ ...f, shortfall: Math.max(f.forecasted_demand - f.current_demand, 0) }))
        .filter(f => f.shortfall > 0)
        .sort((a, b) => {
          // increasing first, then stable, then anything else; ties broken by growth % descending
          const rankA = trendRank[a.trend] ?? 2
          const rankB = trendRank[b.trend] ?? 2
          if (rankA !== rankB) return rankA - rankB
          return growthPercent(b) - growthPercent(a)
        })
    })

    // Slider max: cost of covering every shortfall, rounded up to the next 1000
    const maxBudget = computed(() => {
      const total = candidates.value.reduce((sum, c) => sum + c.shortfall * c.unit_cost, 0)
      return Math.ceil(total / BUDGET_MAX_ROUNDING) * BUDGET_MAX_ROUNDING
    })

    // Greedy allocation in priority order. Unticked items get 0 and don't consume budget.
    // Each ticked item receives its full shortfall if it fits in the remaining budget;
    // otherwise it receives floor(remaining / unit_cost) units (a partial quantity, if > 0).
    // We keep walking afterwards because a cheaper later item may still fit the leftover.
    const rows = computed(() => {
      let remaining = toCents(budget.value)
      return candidates.value.map(c => {
        const included = !excludedSkus.value.has(c.item_sku)
        let quantity = 0
        const unit = toCents(c.unit_cost)
        if (included && unit > 0) {
          const fullCost = c.shortfall * unit
          quantity = fullCost <= remaining ? c.shortfall : Math.max(Math.floor(remaining / unit), 0)
          remaining -= quantity * unit
        }
        return { ...c, included, quantity }
      })
    })

    const orderItems = computed(() => rows.value.filter(r => r.quantity > 0))
    // Sum and subtract in cents, convert to dollars only for display
    const orderTotalCents = computed(() => orderItems.value.reduce((sum, r) => sum + r.quantity * toCents(r.unit_cost), 0))
    const orderTotal = computed(() => fromCents(orderTotalCents.value))
    const remainingBudget = computed(() => fromCents(toCents(budget.value) - orderTotalCents.value))
    const orderLeadTime = computed(() => Math.max(0, ...orderItems.value.map(r => r.lead_time_days)))
    // A showing confirmation blocks re-submitting the identical order; changing the budget or
    // selection clears it (see watch below) and re-enables the button.
    const canSubmit = computed(() => orderItems.value.length > 0 && !submitting.value && !confirmation.value)

    // Stale feedback must not outlive the inputs it refers to
    watch([budget, excludedSkus], () => {
      confirmation.value = null
      submitError.value = null
    })

    const toggleItem = (sku) => {
      const next = new Set(excludedSkus.value)
      if (next.has(sku)) next.delete(sku)
      else next.add(sku)
      excludedSkus.value = next
    }

    const loadForecasts = async () => {
      try {
        loading.value = true
        forecasts.value = await api.getDemandForecasts()
        // Default budget: 50% of max, snapped to the slider step so the thumb sits on a tick
        budget.value = Math.round(maxBudget.value * 0.5 / BUDGET_STEP) * BUDGET_STEP
      } catch (err) {
        error.value = t('restocking.loadFailed') + ': ' + err.message
      } finally {
        loading.value = false
      }
    }

    const placeOrder = async () => {
      if (!canSubmit.value) return
      submitting.value = true
      submitError.value = null
      confirmation.value = null
      try {
        // Only items with a positive quantity; the server re-prices from its own catalog
        confirmation.value = await api.createRestockingOrder({
          budget: budget.value,
          items: orderItems.value.map(r => ({
            sku: r.item_sku,
            name: r.item_name,
            quantity: r.quantity,
            unit_cost: r.unit_cost
          }))
        })
      } catch (err) {
        // Only trust the server detail if it is a string (validation errors can be arrays/objects)
        const detail = err.response?.data?.detail
        const detailText = typeof detail === 'string' ? detail : ''
        const message = err.response?.status === 400 ? t('restocking.orderRejected') : t('restocking.submitFailed')
        submitError.value = detailText ? `${message} (${detailText})` : message
      } finally {
        submitting.value = false
      }
    }

    const formatDate = (dateString) => {
      // Guard against missing/invalid dates so we never render "Invalid Date"
      const date = new Date(dateString)
      if (!dateString || isNaN(date.getTime())) return '-'
      return date.toLocaleDateString(currentLocale.value === 'ja' ? 'ja-JP' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    }

    onMounted(loadForecasts)

    return {
      t,
      currentCurrency,
      formatCurrency,
      formatCurrencyWithDecimals,
      BUDGET_STEP,
      loading,
      error,
      budget,
      maxBudget,
      rows,
      orderTotal,
      remainingBudget,
      orderLeadTime,
      canSubmit,
      submitting,
      submitError,
      confirmation,
      toggleItem,
      placeOrder,
      formatDate
    }
  }
}
</script>

<style scoped>
.budget-slider {
  display: block;
  width: 100%;
  accent-color: var(--color-accent);
  cursor: pointer;
}

.budget-hint {
  margin-top: var(--space-2);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.empty-state {
  padding: var(--space-8) var(--space-4);
  text-align: center;
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.include-cell input[type='checkbox'] {
  width: 16px;
  height: 16px;
  accent-color: var(--color-accent);
  cursor: pointer;
  vertical-align: middle;
}

/* Unticked or zero-quantity rows recede */
tr.muted td {
  color: var(--color-text-muted);
  background: var(--color-bg);
}

/* Zero-quantity rows (e.g. budget ran out) are not part of the order: fade them and drop the bold emphasis */
tr.zero-qty td {
  opacity: 0.6;
}

tr.zero-qty strong {
  font-weight: 400;
}

/* Numeric and currency columns: right-aligned with tabular figures */
.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* SKUs stay on one line (e.g. WDG-001) */
.nowrap {
  white-space: nowrap;
}

/* Sits before the quantity so the number stays aligned with the column */
.partial-tag {
  margin-right: var(--space-2);
}

.summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-4) var(--space-8);
  margin-top: var(--space-4);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border);
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.summary-label {
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
}

.summary-value {
  font-size: var(--text-lg);
  font-weight: var(--weight-bold);
  color: var(--color-text);
  font-variant-numeric: tabular-nums;
}

/* Primary button (component-polish button spec) */
.place-order-btn {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  height: 36px;
  padding: 0 var(--space-4);
  background: var(--color-accent);
  /* On-accent text: no token, white is the fixed contrast pair for the accent fill */
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  cursor: pointer;
  transition: background-color var(--transition);
}

.place-order-btn:hover:not(:disabled) {
  background: var(--color-accent-hover);
}

.place-order-btn:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

.place-order-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.confirmation {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-4) var(--space-5);
  background: var(--color-success-soft);
  border: 1px solid color-mix(in srgb, var(--color-success) 25%, transparent);
  border-radius: var(--radius-md);
  color: var(--color-success);
  font-size: var(--text-sm);
}

.confirmation a {
  color: var(--color-success);
  font-weight: var(--weight-semibold);
}
</style>
