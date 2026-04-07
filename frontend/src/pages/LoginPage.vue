<template>
  <q-layout view="lHh Lpr lFf">
    <q-page-container>
      <q-page class="login-page flex flex-center">

        <!-- Background particles -->
        <div class="bg-orb orb-1"></div>
        <div class="bg-orb orb-2"></div>
        <div class="bg-orb orb-3"></div>

        <q-card class="login-card fade-up">
          <!-- Logo -->
          <div class="login-logo">
            <div class="logo-icon">
              <q-icon name="home_work" size="36px" color="white" />
            </div>
            <div class="logo-text">InmoGest</div>
            <div class="logo-sub">CRM Inmobiliario</div>
          </div>

          <q-card-section class="q-pt-none">
            <q-form @submit.prevent="handleLogin" class="q-gutter-y-md">

              <q-input v-model="form.email" type="email" label="Correo electrónico"
                dark filled dense class="login-input"
                :rules="[v => !!v || 'Requerido', v => /.+@.+/.test(v) || 'Email inválido']">
                <template #prepend>
                  <q-icon name="email" size="18px" color="primary" />
                </template>
              </q-input>

              <q-input v-model="form.password" :type="showPass ? 'text' : 'password'"
                label="Contraseña" dark filled dense class="login-input"
                :rules="[v => !!v || 'Requerido']">
                <template #prepend>
                  <q-icon name="lock" size="18px" color="primary" />
                </template>
                <template #append>
                  <q-icon :name="showPass ? 'visibility_off' : 'visibility'"
                    class="cursor-pointer" color="grey-5"
                    @click="showPass = !showPass" />
                </template>
              </q-input>

              <q-banner v-if="error" class="error-banner" rounded dense>
                <template #avatar><q-icon name="error_outline" color="negative" /></template>
                {{ error }}
              </q-banner>

              <q-btn type="submit" :loading="loading" label="Iniciar sesión"
                class="login-btn full-width" unelevated no-caps>
                <template #loading>
                  <q-spinner-dots color="white" size="24px" />
                </template>
              </q-btn>

            </q-form>
          </q-card-section>

          <!-- Demo credentials hint -->
          <q-card-section class="q-pt-none">
            <div class="demo-hint">
              <span class="hint-label">Demo:</span>
              <span class="hint-val" @click="fillDemo('admin')">Admin</span>
              <span class="hint-sep">·</span>
              <span class="hint-val" @click="fillDemo('agente')">Agente</span>
            </div>
          </q-card-section>
        </q-card>

      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useQuasar } from 'quasar'

const router = useRouter()
const auth   = useAuthStore()
const $q     = useQuasar()

const form     = ref({ email: '', password: '' })
const showPass = ref(false)
const loading  = ref(false)
const error    = ref('')

const demos = {
  admin:  { email: 'admin@crminmobiliario.es', password: 'Admin1234!' },
  agente: { email: 'agente1@crminmobiliario.es', password: 'Agent1234!' }
}

function fillDemo(role) {
  form.value = { ...demos[role] }
}

async function handleLogin() {
  loading.value = true
  error.value   = ''
  try {
    await auth.login(form.value.email, form.value.password)
    $q.notify({ type: 'positive', message: `Bienvenido, ${auth.user.nombre}!` })
    router.push('/dashboard')
  } catch (e) {
    error.value = e.response?.data?.error || 'Error de conexión'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: radial-gradient(ellipse at 20% 50%, #0f2236 0%, #0d1b2a 60%, #070e18 100%);
  position: relative; overflow: hidden;
}

.bg-orb {
  position: absolute; border-radius: 50%;
  filter: blur(80px); pointer-events: none;
}
.orb-1 { width: 400px; height: 400px; top: -100px; left: -100px; background: rgba(45,125,210,.12); }
.orb-2 { width: 300px; height: 300px; bottom: -50px; right: -50px; background: rgba(240,165,0,.08); }
.orb-3 { width: 200px; height: 200px; top: 40%; left: 60%; background: rgba(45,125,210,.06); }

.login-card {
  width: 100%; max-width: 400px;
  background: rgba(15,34,54,0.85) !important;
  backdrop-filter: blur(20px);
  border: 1px solid #1e3a52;
  border-radius: 20px !important;
  box-shadow: 0 24px 64px rgba(0,0,0,.6);
  padding: 1.5rem;
}

.login-logo {
  text-align: center; padding: 1.5rem 0 1.25rem;
}
.logo-icon {
  width: 64px; height: 64px; border-radius: 16px; margin: 0 auto .75rem;
  background: linear-gradient(135deg, #1a3a5c 0%, #2d7dd2 100%);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 8px 24px rgba(45,125,210,.4);
}
.logo-text { font-size: 1.5rem; font-weight: 800; color: #e2e8f0; }
.logo-sub  { font-size: .72rem; color: #64748b; text-transform: uppercase; letter-spacing: .1em; }

.login-input { border-radius: 10px; }
.login-btn {
  height: 48px;
  background: linear-gradient(135deg, #1a3a5c 0%, #2d7dd2 100%);
  border-radius: 10px !important;
  font-size: 1rem; font-weight: 600; color: white;
  transition: all .2s ease;
}
.login-btn:hover { box-shadow: 0 8px 24px rgba(45,125,210,.4); transform: translateY(-1px); }

.error-banner {
  background: rgba(229,57,53,.12) !important;
  border: 1px solid rgba(229,57,53,.3);
  color: #f87171;
}

.demo-hint {
  text-align: center; font-size: .75rem; color: #475569;
  display: flex; align-items: center; justify-content: center; gap: .4rem;
}
.hint-label { color: #64748b; }
.hint-val { color: #2d7dd2; cursor: pointer; text-decoration: underline; }
.hint-val:hover { color: #60a5fa; }
.hint-sep { color: #334155; }
</style>
