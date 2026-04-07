<template>
  <q-page class="page-content">
    <div class="page-header fade-up">
      <div>
        <h1 class="page-title">💰 Comisiones</h1>
        <p class="page-sub">Gestión de comisiones y pagos a agentes</p>
      </div>
    </div>

    <!-- Resumen comisiones -->
    <div class="comm-summary fade-up" v-if="resumen">
      <div class="comm-kpi" v-for="k in summaryKpis" :key="k.label" :style="{ borderColor: k.color }">
        <div class="comm-kpi-label">{{ k.label }}</div>
        <div class="comm-kpi-val" :style="{ color: k.color }">{{ fmt(k.value) }}</div>
      </div>
    </div>

    <!-- Tabla comisiones -->
    <div class="glass-card fade-up" style="animation-delay:80ms">
      <div class="table-toolbar">
        <q-select v-model="filtroEstado" :options="estadoOpts" label="Estado" dark dense
          emit-value map-options clearable @update:model-value="loadComisiones"
          style="width:160px" />
        <q-space />
        <div class="section-title" style="margin:0">{{ comisiones.length }} registros</div>
      </div>

      <q-table :rows="comisiones" :columns="columns" :loading="loading"
        row-key="id" dark flat :pagination="{ rowsPerPage: 15 }"
        class="crm-table">

        <template #body-cell-estado="{ value }">
          <q-td>
            <span class="status-chip" :class="value">{{ estadoLabel(value) }}</span>
          </q-td>
        </template>

        <template #body-cell-importe_agente="{ value }">
          <q-td class="text-right text-weight-bold" :class="value > 0 ? 'text-positive' : ''">
            {{ fmt(value) }}
          </q-td>
        </template>

        <template #body-cell-comision_neta_agencia="{ value }">
          <q-td class="text-right">{{ fmt(value) }}</q-td>
        </template>

        <template #body-cell-acciones="{ row }">
          <q-td class="text-center">
            <q-btn v-if="row.estado === 'pendiente'" flat dense no-caps size="sm"
              color="primary" label="Aprobar" @click="aprobar(row.id)" />
            <q-btn v-if="row.estado === 'aprobada'" flat dense no-caps size="sm"
              color="positive" label="Pagar" @click="openPago(row)" />
            <q-btn flat round icon="history" size="sm" color="grey-5"
              @click="verHistorico(row.id)">
              <q-tooltip>Histórico pagos</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </div>

    <!-- Dialog: Registrar pago -->
    <q-dialog v-model="showPago" persistent>
      <q-card dark style="width:400px;border:1px solid #1e3a52;border-radius:16px;background:#0f2236">
        <q-card-section>
          <div class="text-h6">💳 Registrar Pago a Agente</div>
          <div class="text-caption text-grey-6 q-mt-xs" v-if="pagoItem">
            {{ pagoItem.agente }} — {{ fmt(pagoItem.importe_agente) }}
          </div>
        </q-card-section>
        <q-separator dark />
        <q-card-section class="q-gutter-y-sm">
          <q-input v-model="pagoForm.importe" label="Importe pagado (€)" type="number" dark filled dense />
          <q-select v-model="pagoForm.metodo_pago" :options="metodosOpts" label="Método de pago"
            dark filled dense emit-value map-options />
          <q-input v-model="pagoForm.referencia" label="Referencia / Nº transferencia" dark filled dense />
          <q-input v-model="pagoForm.notas" label="Notas" dark filled dense />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" color="grey-5" v-close-popup />
          <q-btn unelevated label="Confirmar Pago" color="positive" no-caps
            @click="confirmarPago" :loading="saving" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import api from '@/services/api'

const $q = useQuasar()
const comisiones  = ref([])
const resumen     = ref(null)
const loading     = ref(false)
const saving      = ref(false)
const filtroEstado = ref(null)
const showPago    = ref(false)
const pagoItem    = ref(null)
const pagoForm    = ref({ importe: 0, metodo_pago: 'transferencia', referencia: '', notas: '' })

const estadoOpts  = [
  { label: 'Pendiente',  value: 'pendiente' },
  { label: 'Aprobada',   value: 'aprobada'  },
  { label: 'Pagada',     value: 'pagada'    },
  { label: 'Cancelada',  value: 'cancelada' },
]
const metodosOpts = ['transferencia','cheque','efectivo','bizum'].map(v => ({ label: v.charAt(0).toUpperCase()+v.slice(1), value: v }))

const columns = [
  { name: 'referencia',           label: 'Ref.',      field: 'referencia',           sortable: true },
  { name: 'titulo',               label: 'Inmueble',  field: 'titulo',               sortable: true },
  { name: 'agente',               label: 'Agente',    field: 'agente_nombre',        sortable: true },
  { name: 'comision_neta_agencia',label: 'Com. Neta', field: 'comision_neta_agencia',sortable: true },
  { name: 'importe_agente',       label: 'Al Agente', field: 'importe_agente',       sortable: true },
  { name: 'estado',               label: 'Estado',    field: 'estado',               sortable: true },
  { name: 'acciones',             label: '',          field: 'acciones'              },
]

const summaryKpis = computed(() => [
  { label: 'Total pendiente',  value: resumen.value?.pendiente, color: '#f0a500' },
  { label: 'Total pagado',     value: resumen.value?.pagado,    color: '#4ade80' },
  { label: 'Total histórico',  value: resumen.value?.total,     color: '#60a5fa' },
])

const fmt = (v) => v ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v) : '—'
const estadoLabel = (v) => ({ pendiente:'Pendiente', aprobada:'Aprobada', pagada:'Pagada', cancelada:'Cancelada' }[v] || v)

async function loadComisiones() {
  loading.value = true
  try {
    const params = {}
    if (filtroEstado.value) params.estado = filtroEstado.value
    const { data } = await api.get('/commissions', { params })
    comisiones.value = data.data || []
    resumen.value    = data.resumen
  } finally { loading.value = false }
}

async function aprobar(id) {
  await api.put(`/commissions/${id}/approve`)
  $q.notify({ type: 'positive', message: 'Comisión aprobada' })
  loadComisiones()
}

function openPago(row) {
  pagoItem.value = row
  pagoForm.value = { importe: row.importe_agente, metodo_pago: 'transferencia', referencia: '', notas: '' }
  showPago.value = true
}

async function confirmarPago() {
  saving.value = true
  try {
    await api.post(`/commissions/${pagoItem.value.id}/pay`, pagoForm.value)
    $q.notify({ type: 'positive', message: 'Pago registrado en el histórico' })
    showPago.value = false
    loadComisiones()
  } catch (e) {
    $q.notify({ type: 'negative', message: e.response?.data?.error || 'Error' })
  } finally { saving.value = false }
}

async function verHistorico(id) {
  const { data } = await api.get(`/commissions/${id}/history`)
  $q.dialog({
    title: '📋 Histórico de Pagos',
    message: data.length
      ? data.map(p => `${new Date(p.fecha_pago).toLocaleDateString('es-ES')} — ${fmt(p.importe)} (${p.metodo_pago})`).join('\n')
      : 'Sin pagos registrados aún.',
    ok: 'Cerrar'
  })
}

onMounted(loadComisiones)
</script>

<style scoped>
.page-content { padding: 1.25rem; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 1rem; }
.page-title  { font-size: 1.4rem; font-weight: 800; color: #e2e8f0; margin: 0; }
.page-sub    { font-size: .8rem; color: #64748b; margin: .2rem 0 0; }

.comm-summary {
  display: flex; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap;
}
.comm-kpi {
  flex: 1; min-width: 140px;
  background: var(--color-surface); border-radius: 12px;
  border: 1px solid var(--color-border); border-left: 3px solid;
  padding: .9rem 1.1rem;
}
.comm-kpi-label { font-size: .7rem; color: #64748b; text-transform: uppercase; letter-spacing: .05em; }
.comm-kpi-val   { font-size: 1.4rem; font-weight: 800; margin-top: .2rem; }

.table-toolbar { display: flex; align-items: center; padding: .75rem 1rem; border-bottom: 1px solid var(--color-border); margin-bottom: .5rem; }

.status-chip {
  font-size: .7rem; font-weight: 700; padding: .2rem .6rem;
  border-radius: 20px; text-transform: uppercase; letter-spacing: .05em;
}
.pendiente { background: rgba(240,165,0,0.15); color: #f0a500; }
.aprobada  { background: rgba(45,125,210,0.15); color: #60a5fa; }
.pagada    { background: rgba(33,186,69,0.15);  color: #4ade80; }
.cancelada { background: rgba(229,57,53,0.15);  color: #f87171; }
</style>
