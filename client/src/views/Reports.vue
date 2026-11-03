<template>
  <div class="reports">
    <div class="page-header">
      <h2>{{ t('reports.title') }}</h2>
      <p>{{ t('reports.subtitle') }}</p>
    </div>

    <div v-if="loading" class="loading">{{ t('reports.loading') }}</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else>
      <!-- Quarterly Performance -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">{{ t('reports.quarterlyPerformance') }}</h3>
        </div>
        <div class="table-container">
          <table class="reports-table">
            <thead>
              <tr>
                <th>{{ t('reports.quarter') }}</th>
                <th class="num">{{ t('reports.totalOrders') }}</th>
                <th class="num">{{ t('reports.totalRevenue') }}</th>
                <th class="num">{{ t('reports.avgOrderValue') }}</th>
                <th class="num">{{ t('reports.fulfillmentRate') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="q in quarterlyData" :key="q.quarter">
                <td class="nowrap">
                  <strong>{{ q.quarter }}</strong>
                </td>
                <td class="num">{{ q.total_orders }}</td>
                <td class="num">{{ money(q.total_revenue) }}</td>
                <td class="num">{{ money(q.avg_order_value) }}</td>
                <td class="num">
                  <span :class="getFulfillmentClass(q.fulfillment_rate)"> {{ q.fulfillment_rate }}% </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Monthly Trends Chart -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">{{ t('reports.monthlyRevenueTrend') }}</h3>
        </div>
        <div class="chart-container">
          <div class="bar-chart">
            <div v-for="month in monthlyData" :key="month.month" class="bar-wrapper">
              <div class="bar-container">
                <div
                  class="bar"
                  :style="{ height: getBarHeight(month.revenue) + 'px' }"
                  :title="money(month.revenue)"
                ></div>
              </div>
              <div class="bar-label">{{ formatMonth(month.month) }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Month-over-Month Comparison -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">{{ t('reports.monthOverMonth') }}</h3>
        </div>
        <div class="table-container">
          <table class="reports-table">
            <thead>
              <tr>
                <th>{{ t('reports.month') }}</th>
                <th class="num">{{ t('reports.orders') }}</th>
                <th class="num">{{ t('reports.revenue') }}</th>
                <th class="num">{{ t('reports.change') }}</th>
                <th class="num">{{ t('reports.growthRate') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(month, index) in monthlyData" :key="month.month">
                <td class="nowrap">
                  <strong>{{ formatMonth(month.month) }}</strong>
                </td>
                <td class="num">{{ month.order_count }}</td>
                <td class="num">{{ money(month.revenue) }}</td>
                <td class="num">
                  <span v-if="index > 0" :class="getChangeClass(month.revenue, monthlyData[index - 1].revenue)">
                    {{ getChangeValue(month.revenue, monthlyData[index - 1].revenue) }}
                  </span>
                  <span v-else>-</span>
                </td>
                <td class="num">
                  <span v-if="index > 0" :class="getChangeClass(month.revenue, monthlyData[index - 1].revenue)">
                    {{ getGrowthRate(month.revenue, monthlyData[index - 1].revenue) }}
                  </span>
                  <span v-else>-</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Summary Stats -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">{{ t('reports.totalRevenueYtd') }}</div>
          <div class="stat-value">{{ money(totalRevenue) }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">{{ t('reports.avgMonthlyRevenue') }}</div>
          <div class="stat-value">{{ money(avgMonthlyRevenue) }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">{{ t('reports.totalOrdersYtd') }}</div>
          <div class="stat-value">{{ totalOrders }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">{{ t('reports.bestQuarter') }}</div>
          <div class="stat-value">{{ bestQuarter }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
import { useI18n } from '../composables/useI18n'
import { formatCurrencyWithDecimals } from '../utils/currency'

export default {
  name: 'Reports',
  setup() {
    const { t, currentLocale, currentCurrency } = useI18n()
    return { t, currentLocale, currentCurrency }
  },
  data() {
    return {
      loading: true,
      error: null,
      quarterlyData: [],
      monthlyData: [],
      totalRevenue: 0,
      avgMonthlyRevenue: 0,
      totalOrders: 0,
      bestQuarter: ''
    }
  },
  mounted() {
    this.loadData()
  },
  methods: {
    async loadData() {
      try {
        this.loading = true

        // Fetch quarterly data
        const quarterlyResponse = await axios.get('http://localhost:8001/api/reports/quarterly')
        this.quarterlyData = quarterlyResponse.data

        // Fetch monthly data
        const monthlyResponse = await axios.get('http://localhost:8001/api/reports/monthly-trends')
        this.monthlyData = monthlyResponse.data

        // Calculate summary stats
        this.calculateSummaryStats()
      } catch (err) {
        console.error('Error loading reports:', err)
        this.error = this.t('reports.loadFailed') + ': ' + err.message
      } finally {
        this.loading = false
      }
    },

    calculateSummaryStats() {
      // Calculate total revenue
      var total = 0
      for (var i = 0; i < this.monthlyData.length; i++) {
        total = total + this.monthlyData[i].revenue
      }
      this.totalRevenue = total

      // Calculate average monthly revenue
      if (this.monthlyData.length > 0) {
        this.avgMonthlyRevenue = total / this.monthlyData.length
      } else {
        this.avgMonthlyRevenue = 0
      }

      // Calculate total orders
      var orders = 0
      for (var i = 0; i < this.monthlyData.length; i++) {
        orders = orders + this.monthlyData[i].order_count
      }
      this.totalOrders = orders

      // Find best quarter
      var bestQ = ''
      var bestRevenue = 0
      for (var i = 0; i < this.quarterlyData.length; i++) {
        if (this.quarterlyData[i].total_revenue > bestRevenue) {
          bestRevenue = this.quarterlyData[i].total_revenue
          bestQ = this.quarterlyData[i].quarter
        }
      }
      this.bestQuarter = bestQ
    },

    // All amounts come from the API in USD; convert/format per active locale (2 decimals)
    money(amount) {
      return formatCurrencyWithDecimals(amount, this.currentCurrency, 2)
    },

    formatMonth(monthStr) {
      // Convert YYYY-MM to readable format
      var parts = monthStr.split('-')
      var year = parts[0]
      var month = parts[1]

      var monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      var monthIndex = parseInt(month) - 1

      if (this.currentLocale === 'ja') return year + '年' + parseInt(month) + '月'
      return monthNames[monthIndex] + ' ' + year
    },

    getBarHeight(revenue) {
      // Calculate bar height (max height 200px)
      var maxRevenue = 0
      for (var i = 0; i < this.monthlyData.length; i++) {
        if (this.monthlyData[i].revenue > maxRevenue) {
          maxRevenue = this.monthlyData[i].revenue
        }
      }

      if (maxRevenue === 0) {
        return 0
      }

      var height = (revenue / maxRevenue) * 200
      return height
    },

    getFulfillmentClass(rate) {
      if (rate >= 90) {
        return 'badge success'
      } else if (rate >= 75) {
        return 'badge warning'
      } else {
        return 'badge danger'
      }
    },

    getChangeValue(current, previous) {
      var change = current - previous
      if (change > 0) {
        return '+' + this.money(change)
      } else if (change < 0) {
        return '-' + this.money(Math.abs(change))
      } else {
        return this.money(0)
      }
    },

    getChangeClass(current, previous) {
      var change = current - previous
      if (change > 0) {
        return 'positive-change'
      } else if (change < 0) {
        return 'negative-change'
      } else {
        return ''
      }
    },

    getGrowthRate(current, previous) {
      if (previous === 0) {
        return 'N/A'
      }

      var rate = ((current - previous) / previous) * 100
      var sign = rate > 0 ? '+' : ''

      return sign + rate.toFixed(1) + '%'
    }
  }
}
</script>

<style scoped>
/* Cards, tables, stat cards, badges, loading and error come from the global styles. */

/* Numeric and currency columns: right-aligned with tabular figures */
.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* Quarter and month labels stay on one line */
.nowrap {
  white-space: nowrap;
}

/* The chart scrolls inside its card instead of widening the page. */
.chart-container {
  overflow-x: auto;
  padding: var(--space-4) 0 var(--space-2);
}

/* Chart geometry: 12 bars need ~44px each before the rotated labels collide. */
.bar-chart {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  gap: var(--space-2);
  min-width: 560px;
  height: 260px;
}

.bar-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  min-width: 0;
  max-width: 80px;
  height: 100%;
}

.bar-container {
  height: 200px;
  display: flex;
  align-items: flex-end;
  width: 100%;
}

.bar {
  width: 100%;
  background: var(--color-accent);
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  transition: background-color var(--transition);
  cursor: pointer;
}

.bar:hover {
  background: var(--color-accent-hover);
}

.bar-label {
  margin-top: var(--space-6);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  text-align: center;
  transform: rotate(-45deg);
  white-space: nowrap;
}

.positive-change {
  color: var(--color-success);
  font-weight: var(--weight-semibold);
}

.negative-change {
  color: var(--color-danger);
  font-weight: var(--weight-semibold);
}
</style>
