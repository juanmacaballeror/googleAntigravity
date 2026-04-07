<template>
  <q-page class="dashboard-page">

    <!-- ── Top KPI Bar ─────────────────────────────────────────────── -->
    <div class="kpi-grid fade-up">

      <div class="kpi-card" v-for="(kpi, i) in kpiCards" :key="kpi.label"
        :style="{ animationDelay: `${i * 60}ms` }">
        <div class="kpi-icon-wrap" :style="{ background: kpi.gradient }">
          <q-icon :name="kpi.icon" size="22px" color="white" />
        </div>
        <div class="kpi-body">
          <div class="kpi-value">{{ kpi.value }}</div>
          <div class="kpi-label">{{ kpi.label }}</div>
          <div v-if="kpi.sub" class="kpi-sub">{{ kpi.sub }}</div>
        </div>
      </div>

    </div>

    <!-- ── Row 2: Pipeline + Actividad ────────────────────────────── -->
    <div class="dash-grid">

      <!-- Pipeline Kanban -->
      <div class="glass-card pipeline-card fade-up" style="animation-delay:120ms">
        <div class="section-title">
          <q-icon name="view_kanban" color="primary" size="18px" />
          Pipeline de Propiedades
        </div>

        <div class="pipeline-stages">
          <div v-for="stage in pipelineStages" :key="stage.key"
            class="stage-col"
            :class="{ 'stage-active': stage.count > 0 }">
            <div class="stage-header" :style="{ borderColor: stage.color }">
              <q-icon :name="stage.icon" :style="{ color: stage.color }" size="16px" />
              <span class="stage-name">{{ stage.label }}</span>
              <span class="stage-count" :style="{ color: stage.color }">{{ stage.count }}</span>
            </div>
            <div class="stage-bar">
              <div class="stage-fill"
                :style="{ width: barWidth(stage.count) + '%', background: stage.color }" />
            </div>
          </div>
        </div>

        <!-- Total en cartera -->
        <div class="pipeline-footer">
          <span class="pipe-total-label">Total en cartera</span>
          <span class="pipe-total-num">{{ totalPipeline }}</span>
          <q-btn flat dense no-caps size="sm" color="primary" label="Ver todas"
            @click="$router.push('/propiedades')" class="q-ml-auto" />
        </div>
      </div>

      <!-- Actividad reciente -->
      <div class="glass-card activity-card fade-up" style="animation-delay:180ms">
        <div class="section-title">
          <q-icon name="bolt" color="accent" size="18px" />
          Actividad Reciente
          <div class="live-dot q-ml-auto" />
        </div>

        <div class="activity-list">
          <div v-for="log in activityLogs" :key="log.id || log.created_at"
            class="activity-item">
            <div class="act-dot" :class="actionColor(log.accion)" />
            <div class="act-body">
              <div class="act-desc">{{ log.descripcion }}</div>
              <div class="act-meta">
                <span class="act-ref">{{ log.referencia }}</span>
                <span class="act-sep">·</span>
                <span class="act-user">{{ log.usuario }}</span>
                <span class="act-sep">·</span>
                <span class="act-time">{{ formatTime(log.created_at) }}</span>
              </div>
            </div>
          </div>
          <div v-if="!activityLogs.length" class="empty-state">
            <q-icon name="hourglass_empty" size="32px" color="grey-7" />
            <p>Sin actividad reciente</p>
          </div>
        </div>
      </div>

    </div>

    <!-- ── Row 3: Notaría + Gráfico + Resumen financiero ─────────── -->
    <div class="dash-grid-3">

      <!-- Tareas Notaría -->
      <div class="glass-card notaria-card fade-up" style="animation-delay:200ms">
        <div class="section-title">
          <q-icon name="gavel" color="warning" size="18px" />
          Pendientes Notaría
        </div>

        <div v-if="notariaTasks.length === 0" class="empty-state">
          <q-icon name="check_circle" color="positive" size="36px" />
          <p>Sin fechas pendientes</p>
        </div>

        <div v-for="task in notariaTasks" :key="task.id" class="notaria-item">
          <div class="notaria-date-wrap">
            <div class="notaria-day">{{ notariaDay(task.fecha_notaria) }}</div>
            <div class="notaria-mon">{{ notariaMon(task.fecha_notaria) }}</div>
          </div>
          <div class="notaria-info">
            <div class="notaria-title">{{ task.titulo }}</div>
            <div class="notaria-client">{{ task.cliente_nombre }}</div>
            <div class="notaria-ref">Ref: {{ task.referencia }}</div>
          </div>
          <div class="notaria-urgency" :class="urgencyClass(task.fecha_notaria)">
            {{ daysUntil(task.fecha_notaria) }}d
          </div>
        </div>
      </div>

      <!-- Gráfico mensual -->
      <div class="glass-card chart-card fade-up" style="animation-delay:240ms">
        <div class="section-title">
          <q-icon name="bar_chart" color="primary" size="18px" />
          Ingresos Últimos 6 Meses
        </div>
        <div class="chart-wrap" ref="chartContainer">
          <BarChart v-if="chartData" :data="chartData" :options="chartOptions" />
          <div v-else class="chart-placeholder">
            <q-spinner-dots color="primary" size="40px" />
          </div>
        </div>
      </div>

      <!-- Resumen Financiero -->
      <div class="glass-card finance-card fade-up" style="animation-delay:280ms">
        <div class="section-title">
          <q-icon name="account_balance" color="positive" size="18px" />
          Resumen Financiero (Mes)
        </div>

        <div class="finance-rows">
          <div class="fin-row">
            <span class="fin-label">💰 Comisiones ingresadas</span>
            <span class="fin-val positive">{{ fmt(financiero?.comisiones_mes) }}</span>
          </div>
          <div class="fin-row">
            <span class="fin-label">👤 Pagado a agentes</span>
            <span class="fin-val negative">−{{ fmt(financiero?.comisiones_agentes_mes) }}</span>
          </div>
          <div class="fin-row">
            <span class="fin-label">🧾 Gastos operativos</span>
            <span class="fin-val negative">−{{ fmt(financiero?.gastos_mes) }}</span>
          </div>
          <div class="fin-divider" />
          <div class="fin-row fin-total">
            <span class="fin-label">✅ Beneficio neto</span>
            <span class="fin-val" :class="financiero?.beneficio_neto_mes >= 0 ? 'positive' : 'negative'">
              {{ fmt(financiero?.beneficio_neto_mes) }}
            </span>
          </div>
        </div>

        <div class="fin-formula">
          <q-icon name="info" size="14px" color="grey-6" />
          <span>Comisión Agente = 5% de comisión neta</span>
        </div>
      </div>

    </div>

  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Bar as BarChart } from 'vue-chartjs'
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  BarElement, Title, Tooltip, Legend
} from 'chart.js'
import { useDashboardStore } from '@/stores/dashboard'
import { useAuthStore } from '@/stores/auth'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const dash = useDashboardStore()
const auth = useAuthStore()

// ── Data computed from store ───────────────────────────────────────────────────
const pipeline    = computed(() => dash.kpis?.pipeline    || {})
const financiero  = computed(() => dash.kpis?.financiero  || {})
const notariaTasks = computed(() => dash.kpis?.notaria    || [])
const activityLogs = computed(() => dash.kpis?.actividad  || [])

const totalPipeline = computed(() =>
  Object.values(pipeline.value).reduce((s, v) => s + v, 0)
)

// ── KPI Cards ─────────────────────────────────────────────────────────────────
const kpiCards = computed(() => [
  {
    icon: 'home_work', label: 'Propiedades activas',
    value: totalPipeline.value,
    sub: `${pipeline.value.vendida || 0} vendidas`,
    gradient: 'linear-gradient(135deg,#1a3a5c,#2d7dd2)'
  },
  {
    icon: 'payments', label: 'Comisiones del mes',
    value: fmt(financiero.value?.comisiones_mes),
    sub: 'Ingresos brutos',
    gradient: 'linear-gradient(135deg,#065f46,#10b981)'
  },
  {
    icon: 'trending_up', label: 'Beneficio neto',
    value: fmt(financiero.value?.beneficio_neto_mes),
    sub: 'Después de gastos',
    gradient: 'linear-gradient(135deg,#1e3a5f,#f0a500)'
  },
  {
    icon: 'gavel', label: 'Notarías pendientes',
    value: notariaTasks.value.length,
    sub: 'Próximas fechas',
    gradient: 'linear-gradient(135deg,#4c1d95,#7c3aed)'
  }
])

// ── Pipeline stages ────────────────────────────────────────────────────────────
const pipelineStages = computed(() => [
  { key: 'captacion', label: 'Captación',  icon: 'add_home',    color: '#94a3b8', count: pipeline.value.captacion  || 0 },
  { key: 'visita',    label: 'Visita',     icon: 'visibility',  color: '#60a5fa', count: pipeline.value.visita     || 0 },
  { key: 'reserva',   label: 'Reserva',    icon: 'handshake',   color: '#f0a500', count: pipeline.value.reserva    || 0 },
  { key: 'peritaje',  label: 'Peritaje',   icon: 'manage_search',color:'#a78bfa', count: pipeline.value.peritaje   || 0 },
  { key: 'notaria',   label: 'Notaría',    icon: 'gavel',       color: '#fb923c', count: pipeline.value.notaria    || 0 },
  { key: 'vendida',   label: 'Vendida',    icon: 'check_circle',color: '#4ade80', count: pipeline.value.vendida    || 0 },
])

const maxStage = computed(() => Math.max(...pipelineStages.value.map(s => s.count), 1))
const barWidth = (count) => Math.round((count / maxStage.value) * 100)

// ── Chart ─────────────────────────────────────────────────────────────────────
const chartData = computed(() => {
  if (!dash.chart.length) return null
  return {
    labels: dash.chart.map(r => r.mes),
    datasets: [
      {
        label: 'Comisiones',
        data: dash.chart.map(r => parseFloat(r.comisiones)),
        backgroundColor: 'rgba(45,125,210,.7)',
        borderRadius: 6,
      },
      {
        label: 'Beneficio',
        data: dash.chart.map(r => parseFloat(r.beneficio)),
        backgroundColor: 'rgba(240,165,0,.7)',
        borderRadius: 6,
      }
    ]
  }
})

const chartOptions = {
  responsive: true, maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: '#94a3b8', font: { family: 'Inter', size: 11 } } }
  },
  scales: {
    x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,.04)' } },
    y: {
      ticks: {
        color: '#64748b',
        callback: v => new Intl.NumberFormat('es-ES', { notation: 'compact', currency: 'EUR', style: 'currency' }).format(v)
      },
      grid: { color: 'rgba(255,255,255,.04)' }
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (v) => v != null
  ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v)
  : '—'

const formatTime = (ts) => {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  const diff = Math.floor((now - d) / 60000)
  if (diff < 1)   return 'ahora'
  if (diff < 60)  return `${diff}m`
  if (diff < 1440) return `${Math.floor(diff/60)}h`
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

const actionColor = (accion) => ({
  captacion:   'dot-blue',
  visita:      'dot-cyan',
  reserva:     'dot-amber',
  cambio_etapa:'dot-purple',
  documento:   'dot-orange',
  nota:        'dot-grey'
}[accion] || 'dot-grey')

const notariaDay = (d) => new Date(d).toLocaleDateString('es-ES', { day: '2-digit' })
const notariaMon = (d) => new Date(d).toLocaleDateString('es-ES', { month: 'short' }).toUpperCase()
const daysUntil  = (d) => Math.ceil((new Date(d) - new Date()) / 86400000)
const urgencyClass = (d) => {
  const days = daysUntil(d)
  return days <= 7 ? 'urgent' : days <= 14 ? 'warning' : 'normal'
}

onMounted(() => dash.fetchAll())
</script>

<style scoped>
.dashboard-page { padding: 1.25rem; background: var(--color-bg); }

/* KPI Grid */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem; margin-bottom: 1.25rem;
}
@media (max-width: 900px)  { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 500px)  { .kpi-grid { grid-template-columns: 1fr; } }

.kpi-card {
  display: flex; align-items: center; gap: 1rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 14px; padding: 1.1rem;
  transition: transform .2s ease, box-shadow .2s ease;
  animation: fadeInUp .4s ease both;
}
.kpi-card:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,.5); }
.kpi-icon-wrap {
  width: 48px; height: 48px; border-radius: 12px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.kpi-value { font-size: 1.5rem; font-weight: 800; color: #e2e8f0; line-height: 1; }
.kpi-label { font-size: .7rem; color: #64748b; text-transform: uppercase; letter-spacing: .05em; margin-top: .2rem; }
.kpi-sub   { font-size: .75rem; color: #475569; margin-top: .15rem; }

/* Main grid */
.dash-grid {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 1rem; margin-bottom: 1rem;
}
@media (max-width: 768px) { .dash-grid { grid-template-columns: 1fr; } }

.dash-grid-3 {
  display: grid; grid-template-columns: 1fr 1.6fr 1fr;
  gap: 1rem;
}
@media (max-width: 1100px) { .dash-grid-3 { grid-template-columns: 1fr 1fr; } }
@media (max-width: 700px)  { .dash-grid-3 { grid-template-columns: 1fr; } }

.pipeline-card, .activity-card, .notaria-card, .chart-card, .finance-card {
  padding: 1.25rem;
}

/* Pipeline */
.pipeline-stages { display: flex; flex-direction: column; gap: .55rem; }
.stage-col { display: flex; flex-direction: column; gap: .25rem; }
.stage-header {
  display: flex; align-items: center; gap: .4rem;
  border-left: 3px solid; padding-left: .5rem;
}
.stage-name  { font-size: .78rem; color: #94a3b8; flex: 1; }
.stage-count { font-size: .85rem; font-weight: 700; }
.stage-bar   { height: 4px; background: rgba(255,255,255,.06); border-radius: 2px; }
.stage-fill  { height: 100%; border-radius: 2px; transition: width .6s ease; }
.pipeline-footer {
  display: flex; align-items: center; gap: .5rem;
  border-top: 1px solid var(--color-border); padding-top: .75rem; margin-top: .75rem;
}
.pipe-total-label { font-size: .75rem; color: #64748b; }
.pipe-total-num   { font-size: 1rem; font-weight: 700; color: #e2e8f0; }

/* Activity */
.activity-list { display: flex; flex-direction: column; gap: .6rem; max-height: 280px; overflow-y: auto; }
.activity-item { display: flex; align-items: flex-start; gap: .6rem; }
.act-dot {
  width: 8px; height: 8px; border-radius: 50%; margin-top: 5px; flex-shrink: 0;
}
.dot-blue   { background: #60a5fa; }
.dot-cyan   { background: #22d3ee; }
.dot-amber  { background: #f0a500; }
.dot-purple { background: #a78bfa; }
.dot-orange { background: #fb923c; }
.dot-grey   { background: #475569; }

.act-desc { font-size: .82rem; color: #cbd5e1; line-height: 1.3; }
.act-meta { display: flex; gap: .3rem; flex-wrap: wrap; margin-top: .15rem; }
.act-ref  { font-size: .7rem; color: #2d7dd2; font-weight: 600; }
.act-user { font-size: .7rem; color: #64748b; }
.act-time { font-size: .7rem; color: #475569; }
.act-sep  { color: #334155; }

/* Notaría */
.notaria-item {
  display: flex; align-items: center; gap: .75rem;
  padding: .6rem 0; border-bottom: 1px solid rgba(30,58,82,.5);
}
.notaria-date-wrap {
  width: 40px; height: 40px; border-radius: 8px;
  background: var(--color-surface2);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.notaria-day { font-size: .9rem; font-weight: 800; color: #e2e8f0; line-height: 1; }
.notaria-mon { font-size: .55rem; color: #64748b; }
.notaria-info { flex: 1; min-width: 0; }
.notaria-title  { font-size: .8rem; font-weight: 600; color: #e2e8f0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.notaria-client { font-size: .72rem; color: #64748b; }
.notaria-ref    { font-size: .68rem; color: #475569; }
.notaria-urgency {
  font-size: .75rem; font-weight: 700; padding: .2rem .45rem;
  border-radius: 6px; flex-shrink: 0;
}
.urgent  { background: rgba(229,57,53,.2); color: #f87171; }
.warning { background: rgba(240,165,0,.2); color: #f0a500; }
.normal  { background: rgba(100,116,139,.15); color: #94a3b8; }

/* Chart */
.chart-wrap { height: 200px; position: relative; }
.chart-placeholder { height: 200px; display: flex; align-items: center; justify-content: center; }

/* Finance */
.finance-rows { display: flex; flex-direction: column; gap: .5rem; }
.fin-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: .4rem 0;
}
.fin-label { font-size: .8rem; color: #94a3b8; }
.fin-val   { font-size: .9rem; font-weight: 600; }
.positive  { color: #4ade80; }
.negative  { color: #f87171; }
.fin-divider { height: 1px; background: var(--color-border); margin: .25rem 0; }
.fin-total .fin-label { font-weight: 700; color: #e2e8f0; }
.fin-total .fin-val   { font-size: 1.1rem; }
.fin-formula {
  display: flex; align-items: center; gap: .3rem;
  margin-top: .75rem; font-size: .68rem; color: #475569;
  border-top: 1px solid var(--color-border); padding-top: .5rem;
}

/* Empty state */
.empty-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 1.5rem; gap: .5rem; color: #475569;
}
.empty-state p { font-size: .82rem; margin: 0; }
</style>
