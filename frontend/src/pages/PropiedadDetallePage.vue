<template>
  <q-page class="page-content">
    <div class="page-header fade-up">
      <div>
        <q-btn flat icon="arrow_back" @click="$router.back()" color="grey-5" dense class="q-mr-sm" />
        <span class="page-title">{{ prop?.titulo || 'Cargando...' }}</span>
        <span v-if="prop" class="stage-badge q-ml-sm" :class="`stage-${prop.etapa}`">
          {{ stageName(prop.etapa) }}
        </span>
      </div>
      <div class="stage-actions" v-if="prop">
        <q-btn-dropdown unelevated no-caps label="Cambiar etapa" icon="swap_horiz"
          color="secondary" dense>
          <q-list dark>
            <q-item v-for="s in nextStages" :key="s.value" clickable v-close-popup
              @click="cambiarEtapa(s.value)">
              <q-item-section avatar><q-icon :name="s.icon" /></q-item-section>
              <q-item-section>{{ s.label }}</q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
      </div>
    </div>

    <div v-if="loading" class="text-center q-pa-xl"><q-spinner-dots color="primary" size="48px" /></div>

    <div v-else-if="prop" class="detail-grid fade-up">

      <!-- Info principal -->
      <div class="glass-card detail-main">
        <div class="detail-section-title">📍 Datos del inmueble</div>
        <div class="detail-grid-2">
          <div class="detail-field"><span class="df-label">Referencia</span><span class="df-val mono">{{ prop.referencia }}</span></div>
          <div class="detail-field"><span class="df-label">Tipo</span><span class="df-val">{{ prop.tipo }}</span></div>
          <div class="detail-field col-2"><span class="df-label">Dirección</span><span class="df-val">{{ prop.direccion }}, {{ prop.ciudad }}</span></div>
          <div class="detail-field"><span class="df-label">Superficie</span><span class="df-val">{{ prop.superficie_m2 ? prop.superficie_m2 + ' m²' : '—' }}</span></div>
          <div class="detail-field"><span class="df-label">Habitaciones</span><span class="df-val">{{ prop.habitaciones || '—' }}</span></div>
          <div class="detail-field"><span class="df-label">Agente</span><span class="df-val accent">{{ prop.agente_nombre }}</span></div>
        </div>
      </div>

      <!-- Financiero -->
      <div class="glass-card detail-finance" v-if="prop.resumen_financiero || prop.precio_captacion">
        <div class="detail-section-title">💰 Resumen financiero</div>
        <div class="fin-block">
          <div class="fin-row"><span>Precio captación</span><span>{{ fmt(prop.precio_captacion) }}</span></div>
          <div class="fin-row" v-if="prop.precio_venta"><span>Precio venta</span><span class="text-white fw700">{{ fmt(prop.precio_venta) }}</span></div>
          <div v-if="prop.resumen_financiero">
            <div class="fin-divider" />
            <div class="fin-row"><span>Comisión bruta</span><span class="text-positive">{{ fmt(prop.resumen_financiero.comisionBruta) }}</span></div>
            <div class="fin-row"><span>Comisión agente (5%)</span><span class="text-negative">−{{ fmt(prop.resumen_financiero.comisionAgente) }}</span></div>
            <div class="fin-row"><span>Gastos</span><span class="text-negative">−{{ fmt(prop.resumen_financiero.totalGastos) }}</span></div>
            <div class="fin-divider" />
            <div class="fin-row fin-total">
              <span>Beneficio neto</span>
              <span :class="prop.resumen_financiero.beneficioNeto >= 0 ? 'text-positive' : 'text-negative'">
                {{ fmt(prop.resumen_financiero.beneficioNeto) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Visitas recientes -->
      <div class="glass-card detail-visits">
        <div class="detail-section-title">📅 Últimas Visitas ({{ prop.visitas?.length || 0 }})</div>
        <div v-for="v in prop.visitas" :key="v.id" class="mini-visit">
          <q-icon name="calendar_today" size="14px" color="primary" />
          <span>{{ formatDT(v.fecha_hora) }}</span>
          <span class="v-status" :class="v.estado">{{ v.estado }}</span>
        </div>
        <div v-if="!prop.visitas?.length" class="empty-sub">Sin visitas registradas</div>
      </div>

      <!-- Diario -->
      <div class="glass-card detail-diary">
        <div class="detail-section-title">📖 Historial</div>
        <div v-for="log in diaryLogs" :key="log.id" class="mini-log">
          <div class="log-dot" :class="logDotClass(log.accion)" />
          <div>
            <div class="log-desc">{{ log.descripcion }}</div>
            <div class="log-meta">{{ log.usuario_nombre }} · {{ formatTime(log.created_at) }}</div>
          </div>
        </div>
        <div v-if="!diaryLogs.length" class="empty-sub">Sin actividad registrada</div>
      </div>

    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import api from '@/services/api'

const $q    = useQuasar()
const route = useRoute()
const prop  = ref(null)
const diaryLogs = ref([])
const loading   = ref(false)

const stageOrder = ['captacion','visita','reserva','peritaje','notaria','vendida']
const stageOpts  = [
  { label:'Captación',  value:'captacion',  icon:'add_home'      },
  { label:'Visita',     value:'visita',     icon:'visibility'    },
  { label:'Reserva',    value:'reserva',    icon:'handshake'     },
  { label:'Peritaje',   value:'peritaje',   icon:'manage_search' },
  { label:'Notaría',    value:'notaria',    icon:'gavel'         },
  { label:'Vendida',    value:'vendida',    icon:'check_circle'  },
  { label:'Descartada', value:'descartada', icon:'cancel'        },
]

const nextStages = computed(() => {
  if (!prop.value) return []
  const idx = stageOrder.indexOf(prop.value.etapa)
  return stageOpts.filter(s => s.value !== prop.value.etapa && (stageOrder.indexOf(s.value) > idx || s.value === 'descartada'))
})

const stageName = (v) => stageOpts.find(s => s.value === v)?.label || v
const fmt = (v) => v ? new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(v) : '—'
const formatDT   = (v) => v ? new Date(v).toLocaleString('es-ES',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : '—'
const formatTime = (v) => v ? new Date(v).toLocaleString('es-ES',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : '—'
const logDotClass = (a) => ({ captacion:'dot-blue', visita:'dot-cyan', cambio_etapa:'dot-purple', documento:'dot-amber', nota:'dot-grey' }[a] || 'dot-grey')

async function load() {
  loading.value = true
  try {
    const [pRes, dRes] = await Promise.all([
      api.get(`/properties/${route.params.id}`),
      api.get('/diary', { params: { property_id: route.params.id, limit: 20 } })
    ])
    prop.value      = pRes.data
    diaryLogs.value = dRes.data.data || []
  } finally { loading.value = false }
}

async function cambiarEtapa(etapa) {
  await api.put(`/properties/${route.params.id}/stage`, { etapa })
  $q.notify({ type: 'positive', message: `Etapa actualizada: ${stageName(etapa)}` })
  load()
}

onMounted(load)
</script>

<style scoped>
.page-content { padding: 1.25rem; }
.page-header  { display: flex; align-items: center; gap: .5rem; margin-bottom: 1.25rem; flex-wrap: wrap; }
.page-title   { font-size: 1.2rem; font-weight: 700; color: #e2e8f0; }
.stage-actions { margin-left: auto; }

.detail-grid  { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: auto auto; gap: 1rem; }
@media (max-width: 768px) { .detail-grid { grid-template-columns: 1fr; } }

.detail-main    { grid-column: 1; grid-row: 1; padding: 1.25rem; }
.detail-finance { grid-column: 2; grid-row: 1; padding: 1.25rem; }
.detail-visits  { grid-column: 1; grid-row: 2; padding: 1.25rem; }
.detail-diary   { grid-column: 2; grid-row: 2; padding: 1.25rem; }
@media (max-width: 768px) { .detail-main,.detail-finance,.detail-visits,.detail-diary { grid-column:1; grid-row:auto; } }

.detail-section-title { font-size: .85rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: .07em; margin-bottom: .9rem; }
.detail-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: .6rem; }
.detail-field { display: flex; flex-direction: column; gap: .15rem; }
.detail-field.col-2 { grid-column: span 2; }
.df-label { font-size: .68rem; color: #64748b; text-transform: uppercase; letter-spacing: .05em; }
.df-val   { font-size: .88rem; font-weight: 600; color: #e2e8f0; }
.df-val.accent { color: #2d7dd2; }
.mono { font-family: monospace; }

.fin-block { display: flex; flex-direction: column; gap: .45rem; }
.fin-row   { display: flex; justify-content: space-between; font-size: .82rem; color: #94a3b8; }
.fin-row span:last-child { font-weight: 600; }
.fin-total { font-weight: 800 !important; }
.fin-total span { font-size: 1rem !important; }
.fw700 { font-weight: 700; }
.fin-divider { height: 1px; background: var(--color-border); margin: .3rem 0; }
.text-positive { color: #4ade80; }
.text-negative { color: #f87171; }
.text-white    { color: #e2e8f0; }

.mini-visit { display: flex; align-items: center; gap: .5rem; font-size: .8rem; color: #94a3b8; padding: .3rem 0; border-bottom: 1px solid rgba(30,58,82,0.4); }
.v-status   { font-size: .68rem; font-weight: 700; padding: .1rem .4rem; border-radius: 10px; text-transform: uppercase; }
.realizada  { background: rgba(33,186,69,0.15);  color: #4ade80; }
.programada { background: rgba(45,125,210,0.15); color: #60a5fa; }
.cancelada  { background: rgba(229,57,53,0.15);  color: #f87171; }

.mini-log  { display: flex; gap: .6rem; align-items: flex-start; padding: .45rem 0; border-bottom: 1px solid rgba(30,58,82,0.4); }
.log-dot   { width: 8px; height: 8px; border-radius: 50%; margin-top: 5px; flex-shrink: 0; }
.dot-blue  { background: #60a5fa; } .dot-cyan { background: #22d3ee; }
.dot-purple{ background: #a78bfa; } .dot-amber { background: #f0a500; }
.dot-grey  { background: #475569; }
.log-desc  { font-size: .8rem; color: #cbd5e1; }
.log-meta  { font-size: .68rem; color: #475569; margin-top: .1rem; }
.empty-sub { font-size: .8rem; color: #475569; padding: .5rem 0; }
</style>
