<template>
  <q-page class="page-content">
    <div class="page-header fade-up">
      <div>
        <h1 class="page-title">👥 Clientes</h1>
        <p class="page-sub">Compradores y vendedores registrados</p>
      </div>
      <q-btn unelevated no-caps icon="person_add" label="Nuevo Cliente"
        color="primary" @click="openForm()" class="add-btn" />
    </div>

    <!-- Búsqueda -->
    <div class="glass-card filters-bar fade-up">
      <q-input v-model="buscar" placeholder="Buscar por nombre, email, DNI..." dark dense
        debounce="400" @update:model-value="loadClients" style="flex:1;min-width:220px">
        <template #prepend><q-icon name="search" color="grey-6" /></template>
      </q-input>
      <q-select v-model="filtroTipo" :options="tipoOpts" label="Tipo" dark dense
        emit-value map-options clearable @update:model-value="loadClients" style="width:150px" />
    </div>

    <!-- Grid de clientes -->
    <div class="clients-grid fade-up" style="animation-delay:80ms">
      <div v-for="c in clients" :key="c.id" class="client-card glass-card">
        <div class="client-avatar">
          {{ initials(c) }}
        </div>
        <div class="client-info">
          <div class="client-name">{{ c.nombre }} {{ c.apellidos }}</div>
          <div class="client-meta" v-if="c.email">
            <q-icon name="email" size="12px" /> {{ c.email }}
          </div>
          <div class="client-meta" v-if="c.telefono">
            <q-icon name="phone" size="12px" /> {{ c.telefono }}
          </div>
          <div class="client-meta" v-if="c.dni_nie">
            <q-icon name="badge" size="12px" /> {{ c.dni_nie }}
          </div>
        </div>
        <div class="client-actions">
          <span class="tipo-badge" :class="c.tipo">{{ tipoLabel(c.tipo) }}</span>
          <q-btn flat round icon="edit" size="xs" color="grey-5" @click="openForm(c)" />
        </div>
      </div>

      <div v-if="!loading && !clients.length" class="empty-state col-12">
        <q-icon name="people" size="48px" color="grey-7" /><p>Sin clientes registrados</p>
      </div>
    </div>

    <div v-if="loading" class="text-center q-pa-xl"><q-spinner-dots color="primary" size="40px" /></div>

    <!-- Dialog -->
    <q-dialog v-model="showForm" persistent>
      <q-card dark style="width:500px;max-width:95vw;background:#0f2236;border:1px solid #1e3a52;border-radius:16px">
        <q-card-section class="row items-center">
          <div class="text-h6">{{ editItem ? 'Editar Cliente' : 'Nuevo Cliente' }}</div>
          <q-space /><q-btn flat round icon="close" v-close-popup />
        </q-card-section>
        <q-separator dark />
        <q-card-section class="q-gutter-y-sm">
          <div class="row q-col-gutter-sm">
            <div class="col-6"><q-input v-model="form.nombre"   label="Nombre *"   dark filled dense /></div>
            <div class="col-6"><q-input v-model="form.apellidos" label="Apellidos *" dark filled dense /></div>
            <div class="col-6"><q-input v-model="form.email"    label="Email"       dark filled dense type="email" /></div>
            <div class="col-6"><q-input v-model="form.telefono" label="Teléfono"    dark filled dense /></div>
            <div class="col-6"><q-input v-model="form.dni_nie"  label="DNI / NIE"   dark filled dense /></div>
            <div class="col-6">
              <q-select v-model="form.tipo" :options="tipoOpts" label="Tipo" dark filled dense emit-value map-options />
            </div>
            <div class="col-12"><q-input v-model="form.direccion" label="Dirección" dark filled dense /></div>
            <div class="col-12"><q-input v-model="form.notas" label="Notas" type="textarea" dark filled dense rows="2" /></div>
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" color="grey-5" v-close-popup />
          <q-btn unelevated label="Guardar" color="primary" no-caps @click="save" :loading="saving" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import api from '@/services/api'

const $q = useQuasar()
const clients = ref([])
const loading  = ref(false)
const saving   = ref(false)
const showForm = ref(false)
const editItem = ref(null)
const buscar   = ref('')
const filtroTipo = ref(null)
const form = ref({})

const tipoOpts = [
  { label: 'Comprador', value: 'comprador' },
  { label: 'Vendedor',  value: 'vendedor'  },
  { label: 'Ambos',     value: 'ambos'     },
]

const initials  = (c) => `${c.nombre?.[0]||''}${c.apellidos?.[0]||''}`.toUpperCase()
const tipoLabel = (t) => ({ comprador:'Comprador', vendedor:'Vendedor', ambos:'Ambos' }[t] || t)

async function loadClients() {
  loading.value = true
  try {
    const params = {}
    if (buscar.value)     params.buscar = buscar.value
    if (filtroTipo.value) params.tipo   = filtroTipo.value
    const { data } = await api.get('/clients', { params })
    clients.value = data.data || []
  } finally { loading.value = false }
}

function openForm(item = null) {
  editItem.value = item
  form.value = item ? { ...item } : { tipo: 'comprador' }
  showForm.value = true
}

async function save() {
  saving.value = true
  try {
    if (editItem.value) {
      await api.put(`/clients/${editItem.value.id}`, form.value)
      $q.notify({ type: 'positive', message: 'Cliente actualizado' })
    } else {
      await api.post('/clients', form.value)
      $q.notify({ type: 'positive', message: 'Cliente creado' })
    }
    showForm.value = false; loadClients()
  } catch (e) {
    $q.notify({ type: 'negative', message: e.response?.data?.error || 'Error al guardar' })
  } finally { saving.value = false }
}

onMounted(loadClients)
</script>

<style scoped>
.page-content { padding: 1.25rem; }
.page-header  { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 1rem; }
.page-title   { font-size: 1.4rem; font-weight: 800; color: #e2e8f0; margin: 0; }
.page-sub     { font-size: .8rem; color: #64748b; margin: .2rem 0 0; }
.filters-bar  { display: flex; gap: .75rem; align-items: center; flex-wrap: wrap; padding: .75rem 1rem; margin-bottom: 1rem; }
.add-btn      { border-radius: 8px; }

.clients-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}
.client-card {
  display: flex; align-items: center; gap: .9rem; padding: 1rem;
  transition: transform .2s ease, box-shadow .2s ease;
}
.client-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.5); }

.client-avatar {
  width: 44px; height: 44px; border-radius: 50%;
  background: linear-gradient(135deg, #1a3a5c, #2d7dd2);
  display: flex; align-items: center; justify-content: center;
  font-size: .9rem; font-weight: 700; color: white; flex-shrink: 0;
}
.client-info  { flex: 1; min-width: 0; }
.client-name  { font-size: .9rem; font-weight: 600; color: #e2e8f0; }
.client-meta  { font-size: .72rem; color: #64748b; display: flex; align-items: center; gap: .25rem; margin-top: .2rem; }
.client-actions { display: flex; flex-direction: column; align-items: flex-end; gap: .3rem; }

.tipo-badge { font-size: .65rem; font-weight: 700; padding: .15rem .45rem; border-radius: 12px; text-transform: uppercase; letter-spacing: .04em; }
.comprador { background: rgba(45,125,210,0.2); color: #60a5fa; }
.vendedor  { background: rgba(240,165,0,0.2);  color: #f0a500; }
.ambos     { background: rgba(167,139,250,0.2);color: #a78bfa; }

.empty-state { display: flex; flex-direction: column; align-items: center; padding: 3rem; gap: .5rem; color: #475569; }
.empty-state p { font-size: .85rem; margin: 0; }
</style>
