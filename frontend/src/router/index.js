import { useAuthStore } from '@/stores/auth'

export const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/pages/LoginPage.vue'),
    meta: { public: true }
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '',         redirect: '/dashboard' },
      { path: 'dashboard',    name: 'Dashboard',    component: () => import('@/pages/DashboardPage.vue') },
      { path: 'propiedades',  name: 'Propiedades',  component: () => import('@/pages/PropiedadesPage.vue') },
      { path: 'propiedades/:id', name: 'Propiedad', component: () => import('@/pages/PropiedadDetallePage.vue') },
      { path: 'clientes',     name: 'Clientes',     component: () => import('@/pages/ClientesPage.vue') },
      { path: 'visitas',      name: 'Visitas',      component: () => import('@/pages/VisitasPage.vue') },
      { path: 'comisiones',   name: 'Comisiones',   component: () => import('@/pages/ComisionesPage.vue') },
      { path: 'contratos',    name: 'Contratos',    component: () => import('@/pages/ContratosPage.vue') },
      { path: 'diario',       name: 'Diario',       component: () => import('@/pages/DiarioPage.vue') },
      { path: 'gastos',       name: 'Gastos',       component: () => import('@/pages/GastosPage.vue') },
    ]
  },
  { path: '/:catchAll(.*)', redirect: '/' }
]

export function setupRouterGuards(router) {
  router.beforeEach((to) => {
    const auth = useAuthStore()
    if (!to.meta.public && !auth.token) return { name: 'Login' }
    if (to.name === 'Login' && auth.token) return { name: 'Dashboard' }
  })
}
