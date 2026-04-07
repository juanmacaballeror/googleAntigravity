<template>
  <q-layout view="lHh Lpr lFf">

    <!-- ── Sidebar ── -->
    <q-drawer v-model="drawer" show-if-above :width="240" :breakpoint="768"
      class="crm-sidebar" bordered>

      <!-- Logo / Brand -->
      <div class="sidebar-brand">
        <div class="brand-icon">
          <q-icon name="home_work" size="28px" color="white" />
        </div>
        <div>
          <div class="brand-name">InmoGest</div>
          <div class="brand-sub">CRM Inmobiliario</div>
        </div>
      </div>

      <!-- Navigation -->
      <q-list class="sidebar-nav" padding>
        <template v-for="section in navSections" :key="section.label">
          <div class="nav-section-label">{{ section.label }}</div>
          <q-item v-for="item in section.items" :key="item.to"
            :to="item.to" exact-active-class="nav-active"
            clickable v-ripple class="nav-item">
            <q-item-section avatar>
              <q-icon :name="item.icon" size="20px" />
            </q-item-section>
            <q-item-section>{{ item.label }}</q-item-section>
            <q-item-section side v-if="item.badge">
              <q-badge :color="item.badgeColor || 'accent'" :label="item.badge" />
            </q-item-section>
          </q-item>
        </template>
      </q-list>

      <!-- User info -->
      <div class="sidebar-user">
        <q-avatar size="36px" color="primary" text-color="white" class="q-mr-sm">
          {{ userInitials }}
        </q-avatar>
        <div class="user-info">
          <div class="user-name">{{ auth.user?.nombre }}</div>
          <div class="user-role">{{ roleLabel }}</div>
        </div>
        <q-btn flat round icon="logout" size="sm" color="grey-5"
          @click="handleLogout" class="q-ml-auto">
          <q-tooltip>Cerrar sesión</q-tooltip>
        </q-btn>
      </div>
    </q-drawer>

    <!-- ── Header ── -->
    <q-header class="crm-header" elevated>
      <q-toolbar>
        <q-btn flat round icon="menu" @click="drawer = !drawer"
          class="q-mr-sm lt-md" color="white" />

        <!-- Breadcrumb title -->
        <div class="header-title">{{ currentPageTitle }}</div>

        <q-space />

        <!-- Quick actions -->
        <q-btn flat round icon="add_home" color="white" @click="$router.push('/propiedades')" size="sm">
          <q-tooltip>Nueva propiedad</q-tooltip>
        </q-btn>
        <q-btn flat round icon="notifications" color="white" size="sm" class="q-ml-xs">
          <q-badge color="accent" floating label="3" />
        </q-btn>
        <q-btn flat round icon="refresh" color="white" size="sm" class="q-ml-xs"
          @click="$emit('refresh')">
          <q-tooltip>Actualizar datos</q-tooltip>
        </q-btn>
      </q-toolbar>
    </q-header>

    <!-- ── Main content ── -->
    <q-page-container>
      <router-view v-slot="{ Component }">
        <transition name="fade-slide" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </q-page-container>

  </q-layout>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useQuasar } from 'quasar'

const $q    = useQuasar()
const auth  = useAuthStore()
const route = useRoute()
const router = useRouter()

const drawer = ref(false)

const userInitials = computed(() => {
  const u = auth.user
  if (!u) return 'U'
  return `${u.nombre?.[0] || ''}${u.apellidos?.[0] || ''}`.toUpperCase()
})

const roleLabel = computed(() => ({
  admin: 'Administrador', coordinador: 'Coordinador', agente: 'Agente'
}[auth.user?.role] || ''))

const navSections = computed(() => {
  const isAdmin = auth.isAdmin
  const isCoordi = auth.isCoordinador

  const sections = [
    {
      label: 'Principal',
      items: [
        { to: '/dashboard',   icon: 'dashboard',     label: 'Dashboard' },
        { to: '/propiedades', icon: 'home_work',     label: 'Propiedades' },
        { to: '/visitas',     icon: 'calendar_month', label: 'Visitas' },
        { to: '/diario',      icon: 'menu_book',     label: 'Diario Operativo' },
      ]
    },
    {
      label: 'Gestión',
      items: [
        { to: '/clientes',   icon: 'people',        label: 'Clientes' },
        { to: '/contratos',  icon: 'description',   label: 'Contratos' },
        ...((isAdmin || isCoordi) ? [
          { to: '/comisiones', icon: 'payments',    label: 'Comisiones' },
          { to: '/gastos',    icon: 'receipt_long', label: 'Gastos' },
        ] : [])
      ]
    }
  ]

  return sections
})

const pageTitles = {
  '/dashboard':   '📊 Dashboard',
  '/propiedades': '🏠 Propiedades',
  '/visitas':     '📅 Visitas',
  '/clientes':    '👥 Clientes',
  '/contratos':   '📄 Contratos',
  '/comisiones':  '💰 Comisiones',
  '/gastos':      '🧾 Gastos',
  '/diario':      '📖 Diario Operativo',
}
const currentPageTitle = computed(() => pageTitles[route.path] || 'CRM Inmobiliario')

function handleLogout() {
  $q.dialog({
    title: 'Cerrar sesión',
    message: '¿Seguro que deseas salir?',
    cancel: true, persistent: true,
    ok: { label: 'Salir', color: 'negative', flat: true },
    cancel: { label: 'Cancelar', color: 'grey', flat: true }
  }).onOk(() => {
    auth.logout()
    router.push('/login')
  })
}
</script>

<style scoped>
/* Sidebar */
.crm-sidebar { background: #0a1929 !important; border-right: 1px solid #1e3a52; }

.sidebar-brand {
  display: flex; align-items: center; gap: .75rem;
  padding: 1.25rem 1rem;
  border-bottom: 1px solid #1e3a52;
}
.brand-icon {
  width: 42px; height: 42px; border-radius: 10px;
  background: linear-gradient(135deg, #1a3a5c 0%, #2d7dd2 100%);
  display: flex; align-items: center; justify-content: center;
}
.brand-name { font-size: 1rem; font-weight: 700; color: #e2e8f0; line-height: 1.2; }
.brand-sub  { font-size: .65rem; color: #64748b; text-transform: uppercase; letter-spacing: .08em; }

.sidebar-nav { padding: .75rem 0; }
.nav-section-label {
  font-size: .62rem; text-transform: uppercase; letter-spacing: .1em;
  color: #475569; padding: .75rem 1rem .25rem; font-weight: 600;
}
.nav-item {
  border-radius: 8px; margin: 1px .5rem;
  color: #94a3b8 !important; min-height: 40px;
  transition: all .2s ease;
}
.nav-item:hover { background: rgba(45,125,210,.1) !important; color: #e2e8f0 !important; }
.nav-active     { background: rgba(45,125,210,.2) !important; color: #60a5fa !important; }

.sidebar-user {
  position: absolute; bottom: 0; left: 0; right: 0;
  display: flex; align-items: center;
  padding: .75rem 1rem;
  border-top: 1px solid #1e3a52;
  background: #0a1929;
}
.user-name { font-size: .82rem; font-weight: 600; color: #e2e8f0; }
.user-role { font-size: .68rem; color: #64748b; }

/* Header */
.crm-header {
  background: linear-gradient(135deg, #0a1929 0%, #0f2236 100%) !important;
  border-bottom: 1px solid #1e3a52;
}
.header-title { font-size: 1rem; font-weight: 600; color: #e2e8f0; }

/* Page transition */
.fade-slide-enter-active,
.fade-slide-leave-active { transition: all .22s ease; }
.fade-slide-enter-from   { opacity: 0; transform: translateY(8px); }
.fade-slide-leave-to     { opacity: 0; transform: translateY(-8px); }
</style>
