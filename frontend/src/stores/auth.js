import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('crm_token') || null)
  const user  = ref(JSON.parse(localStorage.getItem('crm_user') || 'null'))

  const isAuthenticated = computed(() => !!token.value)
  const isAdmin         = computed(() => user.value?.role === 'admin')
  const isCoordinador   = computed(() => user.value?.role === 'coordinador')
  const isAgente        = computed(() => user.value?.role === 'agente')

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password })
    token.value = data.token
    user.value  = data.user
    localStorage.setItem('crm_token', data.token)
    localStorage.setItem('crm_user', JSON.stringify(data.user))
  }

  function logout() {
    token.value = null
    user.value  = null
    localStorage.removeItem('crm_token')
    localStorage.removeItem('crm_user')
  }

  return { token, user, isAuthenticated, isAdmin, isCoordinador, isAgente, login, logout }
})
