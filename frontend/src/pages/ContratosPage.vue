<template>
  <q-page class="page-content">
    <div class="page-header fade-up">
      <div>
        <h1 class="page-title">📄 Contratos</h1>
        <p class="page-sub">Arras, hojas de visita y mandatos de venta</p>
      </div>
      <q-btn unelevated no-caps icon="add" label="Nuevo Contrato" color="primary" @click="openForm()" class="add-btn" />
    </div>

    <div class="glass-card filters-bar fade-up">
      <q-select v-model="filtroTipo" :options="tipoOpts" label="Tipo" dark dense
        emit-value map-options clearable @update:model-value="loadContratos" style="width:200px"/>
      <q-toggle v-model="soloFirmados" label="Solo firmados" dark @update:model-value="loadContratos" />
    </div>

    <div class="glass-card fade-up" style="animation-delay:80ms">
      <q-table :rows="contratos" :columns="columns" :loading="loading"
        row-key="id" dark flat :pagination="{ rowsPerPage: 15 }" class="crm-table">

        <template #body-cell-tipo="{ value }">
          <q-td>
            <span class="tipo-badge" :class="value">{{ tipoLabel(value) }}</span>
          </q-td>
        </template>

        <template #body-cell-firmado="{ value }">
          <q-td class="text-center">
            <q-icon :name="value ? 'check_circle' : 'pending'" :color="value ? 'positive' : 'warning'" size="18px" />
          </q-td>
        </template>

        <template #body-cell-precio_acordado="{ value }">
          <q-td class="text-right">{{ fmt(value) }}</q-td>
        </template>

        <template #body-cell-acciones="{ row }">
          <q-td class="text-center" style="white-space:nowrap">
            <q-btn flat round icon="picture_as_pdf" size="sm" color="negative"
              @click="descargarPDF(row.id)" :loading="pdfLoading === row.id">
              <q-tooltip>Descargar PDF</q-tooltip>
            </q-btn>
            <q-btn v-if="!row.firmado" flat round icon="draw" size="sm" color="positive"
              @click="firmar(row.id)">
              <q-tooltip>Marcar firmado</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </div>

    <!-- Dialog nuevo contrato -->
    <q-dialog v-model="showForm" persistent>
      <q-card dark style="width:480px;max-width:95vw;background:#0f2236;border:1px solid #1e3a52;border-radius:16px">
        <q-card-section class="row items-center">
          <div class="text-h6">📄 Nuevo Contrato</div>
          <q-space /><q-btn flat round icon="close" v-close-popup />
        </q-card-section>
        <q-separator dark />
        <q-card-section class="q-gutter-y-sm">
          <q-input v-model="form.property_id" label="ID Propiedad *" dark filled dense />
          <q-input v-model="form.cliente_id"  label="ID Cliente *"   dark filled dense />
          <q-select v-model="form.tipo" :options="tipoOpts" label="Tipo de contrato *"
            dark filled dense emit-value map-options />
          <q-input v-model="form.precio_acordado"  label="Precio acordado (€)"   type="number" dark filled dense />
          <q-input v-model="form.importe_arras"    label="Importe arras (€)"     type="number" dark filled dense />
          <q-input v-model="form.fecha_notaria"    label="Fecha prevista notaría" type="date"   dark filled dense />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" color="grey-5" v-close-popup />
          <q-btn unelevated label="Crear" color="primary" no-caps @click="save" :loading="saving" />
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
const contratos    = ref([])
const loading      = ref(false)
const saving       = ref(false)
const showForm     = ref(false)
const pdfLoading   = ref(null)
const form         = ref({})
const filtroTipo   = ref(null)
const soloFirmados = ref(false)

const tipoOpts = [
  { label: 'Contrato de Arras', value: 'contrato_arras' },
  { label: 'Hoja de Visita',    value: 'hoja_visita'    },
  { label: 'Mandato de Venta',  value: 'mandato_venta'  },
  { label: 'Nota de Encargo',   value: 'nota_encargo'   },
]

const columns = [
  { name: 'referencia',    label: 'Propiedad', field: 'referencia',    sortable: true },
  { name: 'cliente_nombre',label: 'Cliente',   field: 'cliente_nombre',sortable: true },
  { name: 'tipo',          label: 'Tipo',      field: 'tipo',          sortable: true },
  { name: 'precio_acordado',label:'Precio',    field: 'precio_acordado',sortable: true },
  { name: 'firmado',       label: 'Firmado',   field: 'firmado',       sortable: true },
  { name: 'fecha_notaria', label: 'Notaría',   field: 'fecha_notaria'  },
  { name: 'acciones',      label: '',          field: 'acciones'       },
]

const tipoLabel = (v) => ({ contrato_arras:'Arras', hoja_visita:'Visita', mandato_venta:'Mandato', nota_encargo:'Encargo' }[v] || v)
const fmt = (v) => v ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v) : '—'

async function loadContratos() {
  loading.value = true
  try {
    const params = {}
    if (filtroTipo.value) params.tipo = filtroTipo.value
    if (soloFirmados.value) params.firmado = 'true'
    const { data } = await api.get('/contracts', { params })
    contratos.value = data
  } finally { loading.value = false }
}

function openForm() { form.value = { tipo: 'hoja_visita' }; showForm.value = true }

async function save() {
  saving.value = true
  try {
    await api.post('/contracts', form.value)
    $q.notify({ type: 'positive', message: 'Contrato creado' })
    showForm.value = false; loadContratos()
  } catch (e) { $q.notify({ type: 'negative', message: e.response?.data?.error || 'Error' })
  } finally { saving.value = false }
}

async function descargarPDF(id) {
  pdfLoading.value = id
  try {
    const res = await api.get(`/contracts/${id}/pdf`, { responseType: 'blob' })
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a'); a.href = url; a.download = `contrato_${id}.pdf`
    a.click(); URL.revokeObjectURL(url)
    $q.notify({ type: 'positive', message: 'PDF descargado' })
  } catch { $q.notify({ type: 'negative', message: 'Error al generar PDF' })
  } finally { pdfLoading.value = null }
}

async function firmar(id) {
  await api.put(`/contracts/${id}/sign`)
  $q.notify({ type: 'positive', message: 'Contrato marcado como firmado' })
  loadContratos()
}

onMounted(loadContratos)
</script>

<style scoped>
.page-content { padding: 1.25rem; }
.page-header  { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 1rem; }
.page-title   { font-size: 1.4rem; font-weight: 800; color: #e2e8f0; margin: 0; }
.page-sub     { font-size: .8rem; color: #64748b; margin: .2rem 0 0; }
.filters-bar  { display: flex; gap: .75rem; align-items: center; flex-wrap: wrap; padding: .75rem 1rem; margin-bottom: 1rem; }
.add-btn      { border-radius: 8px; }

.tipo-badge       { font-size:.7rem; font-weight:700; padding:.18rem .55rem; border-radius:12px; text-transform:uppercase; letter-spacing:.04em; }
.contrato_arras   { background:rgba(240,165,0,0.15);   color:#f0a500; }
.hoja_visita      { background:rgba(45,125,210,0.15);  color:#60a5fa; }
.mandato_venta    { background:rgba(167,139,250,0.15); color:#a78bfa; }
.nota_encargo     { background:rgba(100,116,139,0.15); color:#94a3b8; }
</style>
