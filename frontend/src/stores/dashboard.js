import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/services/api'

export const useDashboardStore = defineStore('dashboard', () => {
  const kpis     = ref(null)
  const chart    = ref([])
  const ranking  = ref([])
  const loading  = ref(false)
  const error    = ref(null)

  async function fetchKpis() {
    loading.value = true
    error.value   = null
    try {
      const { data } = await api.get('/dashboard/kpis')
      kpis.value = data
    } catch (e) {
      error.value = e.response?.data?.error || 'Error al cargar KPIs'
    } finally {
      loading.value = false
    }
  }

  async function fetchChart() {
    const { data } = await api.get('/dashboard/monthly-chart')
    chart.value = data
  }

  async function fetchRanking() {
    const { data } = await api.get('/dashboard/agents-ranking')
    ranking.value = data
  }

  async function fetchAll() {
    await Promise.all([fetchKpis(), fetchChart(), fetchRanking()])
  }

  return { kpis, chart, ranking, loading, error, fetchKpis, fetchChart, fetchRanking, fetchAll }
})
