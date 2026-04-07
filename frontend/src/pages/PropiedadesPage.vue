<template>
  <q-page class="page-content">
    <div class="page-header fade-up">
      <div>
        <h1 class="page-title">🏠 Propiedades</h1>
        <p class="page-sub">Gestión completa del portfolio inmobiliario</p>
      </div>
      <q-btn unelevated no-caps icon="add" label="Nueva Propiedad"
        color="primary" @click="openForm()" class="add-btn" />
    </div>

    <!-- Filtros -->
    <div class="filters-bar glass-card fade-up">
      <q-input v-model="filters.buscar" placeholder="Buscar por título, ciudad..." dark dense
        debounce="400" @update:model-value="loadProps" class="filter-input">
        <template #prepend><q-icon name="search" color="grey-6" /></template>
      </q-input>
      <q-select v-model="filters.etapa" :options="stageOpts" label="Etapa" dark dense
        emit-value map-options clearable @update:model-value="loadProps" class="filter-select" />
      <q-select v-model="filters.tipo" :options="typeOpts" label="Tipo" dark dense
        emit-value map-options clearable @update:model-value="loadProps" class="filter-select" />
    </div>

    <!-- Tabla -->
    <div class="glass-card fade-up" style="animation-delay:80ms">
      <q-table :rows="props" :columns="columns" :loading="loading"
        row-key="id" dark flat binary-state-sort
        :pagination="{ rowsPerPage: 15 }"
        class="crm-table">

        <template #body-cell-etapa="{ value }">
          <q-td>
            <span class="stage-badge" :class="`stage-${value}`">
              <q-icon :name="stageIcon(value)" size="11px" />
              {{ stageName(value) }}
            </span>
          </q-td>
        </template>

        <template #body-cell-precio_captacion="{ value }">
          <q-td class="text-right font-mono">{{ fmt(value) }}</q-td>
        </template>

        <template #body-cell-acciones="{ row }">
          <q-td class="text-center">
            <q-btn flat round icon="visibility" size="sm" color="primary"
              @click="$router.push(`/propiedades/${row.id}`)">
              <q-tooltip>Ver detalle</q-tooltip>
            </q-btn>
            <q-btn flat round icon="edit" size="sm" color="grey-5"
              @click="openForm(row)">
              <q-tooltip>Editar</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </div>

    <!-- Dialog: Formulario nuevo/editar -->
    <q-dialog v-model="showForm" persistent>
      <q-card class="form-dialog" dark>
        <q-card-section class="row items-center">
          <div class="text-h6">{{ editItem ? 'Editar Propiedad' : 'Nueva Propiedad' }}</div>
          <q-space />
          <q-btn flat round icon="close" v-close-popup />
        </q-card-section>
        <q-separator dark />
        <q-card-section class="q-gutter-y-sm">
          <div class="row q-col-gutter-sm">
            <div class="col-12">
              <q-input v-model="form.titulo" label="Título *" dark filled dense />
            </div>
            <div class="col-6">
              <q-select v-model="form.tipo" :options="typeOpts" label="Tipo" dark filled dense emit-value map-options />
            </div>
            <div class="col-6">
              <q-input v-model="form.superficie_m2" label="Superficie m²" type="number" dark filled dense />
            </div>
            <div class="col-8">
              <q-input v-model="form.direccion" label="Dirección *" dark filled dense />
            </div>
            <div class="col-4">
              <q-input v-model="form.ciudad" label="Ciudad *" dark filled dense />
            </div>
            <div class="col-6">
              <q-input v-model="form.precio_captacion" label="Precio captación (€)" type="number" dark filled dense />
            </div>
            <div class="col-6">
              <q-input v-model="form.comision_pct" label="Comisión agencia (%)" type="number" dark filled dense />
            </div>
            <div class="col-12">
              <q-input v-model="form.descripcion" label="Descripción" type="textarea" dark filled dense rows="2" />
            </div>
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" color="grey-5" v-close-popup />
          <q-btn unelevated label="Guardar" color="primary" no-caps
            @click="saveProperty" :loading="saving" />
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
const props   = ref([])
const loading = ref(false)
const showForm = ref(false)
const saving   = ref(false)
const editItem = ref(null)

const filters = ref({ buscar: '', etapa: null, tipo: null })
const form    = ref({})

const stageOpts = [
  { label: 'Captación', value: 'captacion'  },
  { label: 'Visita',    value: 'visita'     },
  { label: 'Reserva',   value: 'reserva'    },
  { label: 'Peritaje',  value: 'peritaje'   },
  { label: 'Notaría',   value: 'notaria'    },
  { label: 'Vendida',   value: 'vendida'    },
]
const typeOpts = [
  { label: 'Piso',    value: 'piso'    },
  { label: 'Casa',    value: 'casa'    },
  { label: 'Local',   value: 'local'   },
  { label: 'Oficina', value: 'oficina' },
  { label: 'Garaje',  value: 'garaje'  },
  { label: 'Terreno', value: 'terreno' },
]

const columns = [
  { name: 'referencia', label: 'Ref.',    field: 'referencia', sortable: true, style: 'width:90px' },
  { name: 'titulo',     label: 'Título',  field: 'titulo',     sortable: true },
  { name: 'ciudad',     label: 'Ciudad',  field: 'ciudad',     sortable: true },
  { name: 'tipo',       label: 'Tipo',    field: 'tipo',       sortable: true },
  { name: 'etapa',      label: 'Etapa',   field: 'etapa',      sortable: true },
  { name: 'precio_captacion', label: 'Precio',  field: 'precio_captacion', sortable: true },
  { name: 'agente_nombre',    label: 'Agente',  field: 'agente_nombre'  },
  { name: 'acciones',         label: '',        field: 'acciones', style: 'width:80px' },
]

const stageNames = { captacion:'Captación', visita:'Visita', reserva:'Reserva',
  peritaje:'Peritaje', notaria:'Notaría', vendida:'Vendida', descartada:'Descartada' }
const stageIcons = { captacion:'add_home', visita:'visibility', reserva:'handshake',
  peritaje:'manage_search', notaria:'gavel', vendida:'check_circle', descartada:'cancel' }

const stageName = (v) => stageNames[v] || v
const stageIcon = (v) => stageIcons[v] || 'circle'
const fmt = (v) => v ? new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(v) : '—'

async function loadProps() {
  loading.value = true
  try {
    const params = {}
    if (filters.value.buscar) params.buscar = filters.value.buscar
    if (filters.value.etapa)  params.etapa  = filters.value.etapa
    if (filters.value.tipo)   params.tipo   = filters.value.tipo
    const { data } = await api.get('/properties', { params })
    props.value = data.data || []
  } catch { $q.notify({ type: 'negative', message: 'Error al cargar propiedades' }) }
  finally { loading.value = false }
}

function openForm(item = null) {
  editItem.value = item
  form.value = item
    ? { ...item }
    : { tipo: 'piso', comision_pct: 3 }
  showForm.value = true
}

async function saveProperty() {
  saving.value = true
  try {
    if (editItem.value) {
      await api.put(`/properties/${editItem.value.id}`, form.value)
      $q.notify({ type: 'positive', message: 'Propiedad actualizada' })
    } else {
      await api.post('/properties', form.value)
      $q.notify({ type: 'positive', message: 'Propiedad creada' })
    }
    showForm.value = false
    loadProps()
  } catch (e) {
    $q.notify({ type: 'negative', message: e.response?.data?.error || 'Error al guardar' })
  } finally { saving.value = false }
}

onMounted(loadProps)
</script>

<style scoped>
.page-content { padding: 1.25rem; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 1rem; }
.page-title  { font-size: 1.4rem; font-weight: 800; color: #e2e8f0; margin: 0; }
.page-sub    { font-size: .8rem; color: #64748b; margin: .2rem 0 0; }
.add-btn { border-radius: 8px; }

.filters-bar {
  display: flex; gap: .75rem; align-items: center; flex-wrap: wrap;
  padding: .75rem 1rem; margin-bottom: 1rem;
}
.filter-input  { flex: 1; min-width: 200px; }
.filter-select { width: 160px; }

.crm-table { border-radius: 12px; }
.font-mono { font-family: monospace; }

.form-dialog { width: 540px; max-width: 95vw; background: #0f2236; border: 1px solid #1e3a52; border-radius: 16px; }
</style>
