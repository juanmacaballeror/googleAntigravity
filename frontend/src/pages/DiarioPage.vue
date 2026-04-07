<template>
  <q-page class="page-content">
    <div class="page-header fade-up">
      <div>
        <h1 class="page-title">📖 Diario Operativo</h1>
        <p class="page-sub">Registro cronológico de hitos y actividad</p>
      </div>
    </div>

    <!-- Filtros -->
    <div class="glass-card filters-bar fade-up">
      <q-input v-model="filters.property_id" placeholder="ID de propiedad..." dark dense
        debounce="500" @update:model-value="loadDiary" style="width:220px">
        <template #prepend><q-icon name="home_work" color="grey-6" /></template>
      </q-input>
      <q-select v-model="filters.accion" :options="accionOpts" label="Acción" dark dense
        emit-value map-options clearable @update:model-value="loadDiary" style="width:160px" />
      <q-input v-model="filters.desde" type="date" label="Desde" dark dense
        @update:model-value="loadDiary" style="width:150px" />
      <q-btn flat no-caps icon="refresh" label="Actualizar" color="grey-5"
        @click="loadDiary" size="sm" />
    </div>

    <!-- Timeline -->
    <div class="diary-timeline fade-up" style="animation-delay:80ms">
      <div v-if="loading" class="diary-loading">
        <q-spinner-dots color="primary" size="40px" />
      </div>

      <div v-for="(group, date) in groupedLogs" :key="date" class="diary-group">

        <!-- Fecha separadora -->
        <div class="diary-date-sep">
          <div class="date-pill">{{ formatDate(date) }}</div>
        </div>

        <!-- Entradas del día -->
        <div v-for="log in group" :key="log.id" class="diary-entry">
          <div class="entry-line-wrap">
            <div class="entry-dot" :class="actionDotClass(log.accion)">
              <q-icon :name="actionIcon(log.accion)" size="12px" color="white" />
            </div>
            <div class="entry-line" />
          </div>

          <div class="entry-body glass-card">
            <div class="entry-top">
              <span class="entry-ref">{{ log.referencia }}</span>
              <span class="entry-prop">{{ log.titulo }}</span>
              <q-space />
              <span class="entry-time">{{ formatTime(log.created_at) }}</span>
            </div>

            <div class="entry-desc">{{ log.descripcion }}</div>

            <div class="entry-footer">
              <q-chip dense dark size="xs" :color="roleColor(log.usuario_role)">
                {{ log.usuario_nombre }}
              </q-chip>
              <q-chip v-if="log.etapa_nueva" dense dark size="xs" color="purple-9">
                → {{ stageName(log.etapa_nueva) }}
              </q-chip>
              <q-chip dense dark size="xs" color="blue-grey-9">
                {{ accionLabel(log.accion) }}
              </q-chip>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty -->
      <div v-if="!loading && !logs.length" class="diary-empty">
        <q-icon name="menu_book" size="52px" color="grey-7" />
        <p>No hay entradas en el diario</p>
      </div>

      <!-- Load more -->
      <div v-if="hasMore" class="text-center q-mt-md">
        <q-btn flat no-caps color="primary" label="Cargar más"
          @click="loadMore" :loading="loadingMore" />
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/services/api'

const logs       = ref([])
const loading    = ref(false)
const loadingMore = ref(false)
const page       = ref(1)
const hasMore    = ref(false)

const filters = ref({ property_id: '', accion: null, desde: '' })

const accionOpts = [
  { label: 'Captación',    value: 'captacion'    },
  { label: 'Visita',       value: 'visita'       },
  { label: 'Cambio etapa', value: 'cambio_etapa' },
  { label: 'Documento',    value: 'documento'    },
  { label: 'Nota',         value: 'nota'         },
]

const groupedLogs = computed(() => {
  const groups = {}
  for (const log of logs.value) {
    const date = new Date(log.created_at).toISOString().slice(0, 10)
    if (!groups[date]) groups[date] = []
    groups[date].push(log)
  }
  return groups
})

async function loadDiary(reset = true) {
  if (reset) { page.value = 1; loading.value = true }
  else loadingMore.value = true
  try {
    const params = { page: page.value, limit: 20 }
    if (filters.value.property_id) params.property_id = filters.value.property_id
    if (filters.value.accion)      params.accion      = filters.value.accion
    if (filters.value.desde)       params.desde       = filters.value.desde
    const { data } = await api.get('/diary', { params })
    if (reset) logs.value = data.data
    else logs.value.push(...data.data)
    hasMore.value = data.data.length === 20
  } finally { loading.value = false; loadingMore.value = false }
}

function loadMore() { page.value++; loadDiary(false) }

const formatDate = (d) => new Date(d).toLocaleDateString('es-ES',
  { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
const formatTime = (ts) => new Date(ts).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })

const stageName = (v) => ({ captacion:'Captación', visita:'Visita', reserva:'Reserva',
  peritaje:'Peritaje', notaria:'Notaría', vendida:'Vendida' }[v] || v)

const accionLabel = (v) => ({ captacion:'Captación', visita:'Visita', cambio_etapa:'Cambio etapa',
  documento:'Documento', nota:'Nota' }[v] || v)

const actionIcon  = (v) => ({ captacion:'add_home', visita:'calendar_month',
  cambio_etapa:'swap_horiz', documento:'description', nota:'edit_note' }[v] || 'circle')

const actionDotClass = (v) => ({ captacion:'dot-primary', visita:'dot-info',
  cambio_etapa:'dot-purple', documento:'dot-warning', nota:'dot-grey' }[v] || 'dot-grey')

const roleColor = (r) => ({ admin:'primary', coordinador:'secondary', agente:'teal' }[r] || 'grey')

onMounted(() => loadDiary())
</script>

<style scoped>
.page-content { padding: 1.25rem; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 1rem; }
.page-title  { font-size: 1.4rem; font-weight: 800; color: #e2e8f0; margin: 0; }
.page-sub    { font-size: .8rem; color: #64748b; margin: .2rem 0 0; }
.filters-bar { display: flex; gap: .75rem; align-items: center; flex-wrap: wrap; padding: .75rem 1rem; margin-bottom: 1rem; }

.diary-timeline { max-width: 800px; margin: 0 auto; }
.diary-loading  { display: flex; justify-content: center; padding: 3rem; }

.diary-date-sep {
  display: flex; align-items: center; justify-content: center;
  margin: 1.5rem 0 .75rem; position: sticky; top: 60px; z-index: 1;
}
.date-pill {
  background: var(--color-surface2); border: 1px solid var(--color-border);
  border-radius: 20px; padding: .2rem .9rem;
  font-size: .72rem; font-weight: 600; color: #94a3b8; text-transform: capitalize;
}

.diary-entry {
  display: flex; gap: .75rem; margin-bottom: .75rem; align-items: flex-start;
}
.entry-line-wrap { display: flex; flex-direction: column; align-items: center; flex-shrink: 0; padding-top: .25rem; }
.entry-dot {
  width: 28px; height: 28px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.dot-primary { background: #1a3a5c; }
.dot-info    { background: #0e7490; }
.dot-purple  { background: #6d28d9; }
.dot-warning { background: #b45309; }
.dot-grey    { background: #334155; }

.entry-line { width: 2px; flex: 1; background: var(--color-border); min-height: 20px; margin-top: 4px; }

.entry-body { flex: 1; padding: .75rem 1rem; }
.entry-top  { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; margin-bottom: .35rem; }
.entry-ref  { font-size: .72rem; font-weight: 700; color: #2d7dd2; background: rgba(45,125,210,0.12); padding: .1rem .4rem; border-radius: 4px; }
.entry-prop { font-size: .8rem; font-weight: 600; color: #e2e8f0; }
.entry-time { font-size: .7rem; color: #475569; }
.entry-desc { font-size: .82rem; color: #94a3b8; line-height: 1.4; margin-bottom: .4rem; }
.entry-footer { display: flex; gap: .3rem; flex-wrap: wrap; }

.diary-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem 2rem; gap: .75rem; color: #475569; }
.diary-empty p { font-size: .9rem; margin: 0; }
</style>
