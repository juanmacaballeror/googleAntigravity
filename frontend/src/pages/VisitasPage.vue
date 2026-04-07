<template>
  <q-page class="page-content">
    <div class="page-header fade-up">
      <div>
        <h1 class="page-title">📅 Visitas</h1>
        <p class="page-sub">Agenda y seguimiento de visitas</p>
      </div>
      <q-btn unelevated no-caps icon="add" label="Nueva Visita" color="primary" @click="openForm()" class="add-btn" />
    </div>

    <div class="glass-card filters-bar fade-up">
      <q-select v-model="filtroEstado" :options="estadoOpts" label="Estado" dark dense
        emit-value map-options clearable @update:model-value="loadVisitas" style="width:160px"/>
      <q-input v-model="filtroDesde" type="date" label="Desde" dark dense
        @update:model-value="loadVisitas" style="width:160px"/>
      <q-input v-model="filtroHasta" type="date" label="Hasta" dark dense
        @update:model-value="loadVisitas" style="width:160px"/>
    </div>

    <div class="glass-card fade-up" style="animation-delay:80ms">
      <q-table :rows="visitas" :columns="columns" :loading="loading"
        row-key="id" dark flat :pagination="{ rowsPerPage: 15 }" class="crm-table">

        <template #body-cell-estado="{ value }">
          <q-td>
            <span class="status-chip" :class="value">{{ estadoLabel(value) }}</span>
          </q-td>
        </template>

        <template #body-cell-fecha_hora="{ value }">
          <q-td>{{ formatDT(value) }}</q-td>
        </template>

        <template #body-cell-interesado="{ value }">
          <q-td class="text-center">
            <q-icon v-if="value === true"  name="thumb_up"   color="positive" size="16px" />
            <q-icon v-if="value === false" name="thumb_down" color="negative" size="16px" />
            <span v-if="value === null" class="text-grey-6">—</span>
          </q-td>
        </template>

        <template #body-cell-acciones="{ row }">
          <q-td class="text-center">
            <q-btn v-if="row.estado === 'programada'" flat dense no-caps size="sm" color="positive"
              icon="check" label="Realizada" @click="marcarRealizada(row)" />
          </q-td>
        </template>
      </q-table>
    </div>

    <!-- Dialog nueva visita -->
    <q-dialog v-model="showForm" persistent>
      <q-card dark style="width:460px;max-width:95vw;background:#0f2236;border:1px solid #1e3a52;border-radius:16px">
        <q-card-section class="row items-center">
          <div class="text-h6">📅 Nueva Visita</div>
          <q-space /><q-btn flat round icon="close" v-close-popup />
        </q-card-section>
        <q-separator dark />
        <q-card-section class="q-gutter-y-sm">
          <q-input v-model="form.property_id" label="ID Propiedad *" dark filled dense />
          <q-input v-model="form.cliente_id"  label="ID Cliente *"   dark filled dense />
          <q-input v-model="form.fecha_hora"  label="Fecha y hora *" type="datetime-local" dark filled dense />
          <q-input v-model="form.duracion_min" label="Duración (min)" type="number" dark filled dense />
          <q-input v-model="form.observaciones" label="Observaciones" type="textarea" dark filled dense rows="2" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" color="grey-5" v-close-popup />
          <q-btn unelevated label="Crear Visita" color="primary" no-caps @click="save" :loading="saving" />
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
const visitas = ref([])
const loading = ref(false)
const saving  = ref(false)
const showForm = ref(false)
const form = ref({})
const filtroEstado = ref(null)
const filtroDesde  = ref('')
const filtroHasta  = ref('')

const estadoOpts = [
  { label: 'Programada',    value: 'programada'   },
  { label: 'Realizada',     value: 'realizada'    },
  { label: 'Cancelada',     value: 'cancelada'    },
  { label: 'No presentado', value: 'no_presentado'},
]

const columns = [
  { name: 'referencia',     label: 'Propiedad',  field: 'referencia',     sortable: true },
  { name: 'cliente_nombre', label: 'Cliente',    field: 'cliente_nombre', sortable: true },
  { name: 'agente_nombre',  label: 'Agente',     field: 'agente_nombre',  sortable: true },
  { name: 'fecha_hora',     label: 'Fecha/Hora', field: 'fecha_hora',     sortable: true },
  { name: 'estado',         label: 'Estado',     field: 'estado',         sortable: true },
  { name: 'interesado',     label: 'Interés',    field: 'interesado'   },
  { name: 'acciones',       label: '',           field: 'acciones'     },
]

const estadoLabel = (v) => ({ programada:'Programada', realizada:'Realizada', cancelada:'Cancelada', no_presentado:'No asistió' }[v] || v)
const formatDT = (v) => v ? new Date(v).toLocaleString('es-ES', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : '—'

async function loadVisitas() {
  loading.value = true
  try {
    const params = {}
    if (filtroEstado.value) params.estado = filtroEstado.value
    if (filtroDesde.value)  params.desde  = filtroDesde.value
    if (filtroHasta.value)  params.hasta  = filtroHasta.value
    const { data } = await api.get('/visits', { params })
    visitas.value = data
  } finally { loading.value = false }
}

function openForm() { form.value = {}; showForm.value = true }

async function save() {
  saving.value = true
  try {
    await api.post('/visits', form.value)
    $q.notify({ type: 'positive', message: 'Visita programada' })
    showForm.value = false; loadVisitas()
  } catch (e) { $q.notify({ type: 'negative', message: e.response?.data?.error || 'Error' })
  } finally { saving.value = false }
}

async function marcarRealizada(row) {
  await api.put(`/visits/${row.id}/feedback`, { estado: 'realizada' })
  $q.notify({ type: 'positive', message: 'Visita marcada como realizada' })
  loadVisitas()
}

onMounted(loadVisitas)
</script>

<style scoped>
.page-content { padding: 1.25rem; }
.page-header  { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 1rem; }
.page-title   { font-size: 1.4rem; font-weight: 800; color: #e2e8f0; margin: 0; }
.page-sub     { font-size: .8rem; color: #64748b; margin: .2rem 0 0; }
.filters-bar  { display: flex; gap: .75rem; align-items: center; flex-wrap: wrap; padding: .75rem 1rem; margin-bottom: 1rem; }
.add-btn      { border-radius: 8px; }

.status-chip  { font-size:.7rem; font-weight:700; padding:.2rem .6rem; border-radius:20px; text-transform:uppercase; letter-spacing:.05em; }
.programada   { background:rgba(45,125,210,0.15); color:#60a5fa; }
.realizada    { background:rgba(33,186,69,0.15);  color:#4ade80; }
.cancelada    { background:rgba(229,57,53,0.15);  color:#f87171; }
.no_presentado{ background:rgba(100,116,139,0.15);color:#94a3b8; }
</style>
