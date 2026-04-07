<template>
  <q-page class="page-content">
    <div class="page-header fade-up">
      <div>
        <h1 class="page-title">🧾 Gastos</h1>
        <p class="page-sub">Control de gastos operativos por propiedad</p>
      </div>
      <q-btn unelevated no-caps icon="add" label="Registrar Gasto" color="primary" @click="openForm()" class="add-btn" />
    </div>

    <!-- Resumen por categoría -->
    <div class="gastos-summary fade-up" v-if="resumenCats.length">
      <div v-for="cat in resumenCats" :key="cat.categoria" class="cat-chip glass-card">
        <q-icon :name="catIcon(cat.categoria)" size="18px" :color="catColor(cat.categoria)" />
        <div>
          <div class="cat-nombre">{{ cat.categoria }}</div>
          <div class="cat-total">{{ fmt(cat.total) }}</div>
        </div>
      </div>
    </div>

    <div class="glass-card fade-up" style="animation-delay:80ms">
      <div class="table-toolbar">
        <q-select v-model="filtroCategoria" :options="catOpts" label="Categoría" dark dense
          emit-value map-options clearable @update:model-value="loadGastos" style="width:180px"/>
        <q-input v-model="filtroDesde" type="date" label="Desde" dark dense
          @update:model-value="loadGastos" style="width:150px"/>
        <q-space />
        <div class="total-gastos">Total: <strong>{{ fmt(totalGastos) }}</strong></div>
      </div>

      <q-table :rows="gastos" :columns="columns" :loading="loading"
        row-key="id" dark flat :pagination="{ rowsPerPage: 20 }" class="crm-table">

        <template #body-cell-importe="{ value }">
          <q-td class="text-right text-negative font-weight-bold">−{{ fmt(value) }}</q-td>
        </template>

        <template #body-cell-categoria="{ value }">
          <q-td>
            <q-chip dense dark size="sm" :color="catColor(value)">
              <q-avatar :icon="catIcon(value)" size="14px" />
              {{ value }}
            </q-chip>
          </q-td>
        </template>

        <template #body-cell-acciones="{ row }">
          <q-td class="text-center">
            <q-btn flat round icon="delete" size="sm" color="negative" @click="eliminar(row.id)">
              <q-tooltip>Eliminar gasto</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </div>

    <!-- Dialog -->
    <q-dialog v-model="showForm" persistent>
      <q-card dark style="width:440px;max-width:95vw;background:#0f2236;border:1px solid #1e3a52;border-radius:16px">
        <q-card-section class="row items-center">
          <div class="text-h6">🧾 Registrar Gasto</div>
          <q-space /><q-btn flat round icon="close" v-close-popup />
        </q-card-section>
        <q-separator dark />
        <q-card-section class="q-gutter-y-sm">
          <q-select v-model="form.categoria" :options="catOpts" label="Categoría *"
            dark filled dense emit-value map-options />
          <q-input v-model="form.concepto"   label="Concepto *"       dark filled dense />
          <q-input v-model="form.importe"    label="Importe (€) *"    type="number" dark filled dense />
          <q-input v-model="form.fecha"      label="Fecha"            type="date"   dark filled dense />
          <q-input v-model="form.property_id" label="ID Propiedad (opcional)" dark filled dense />
          <q-input v-model="form.proveedor"  label="Proveedor"        dark filled dense />
          <q-input v-model="form.factura_num" label="Nº Factura"      dark filled dense />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" color="grey-5" v-close-popup />
          <q-btn unelevated label="Guardar" color="primary" no-caps @click="save" :loading="saving"/>
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
const gastos   = ref([])
const loading  = ref(false)
const saving   = ref(false)
const showForm = ref(false)
const form     = ref({})
const filtroCategoria = ref(null)
const filtroDesde     = ref('')

const catOpts = ['peritaje','marketing','notaria','juridico','otro'].map(v => ({ label: v.charAt(0).toUpperCase()+v.slice(1), value: v }))

const columns = [
  { name: 'fecha',       label: 'Fecha',       field: 'fecha',       sortable: true,
    format: v => v ? new Date(v).toLocaleDateString('es-ES') : '—' },
  { name: 'concepto',    label: 'Concepto',    field: 'concepto',    sortable: true },
  { name: 'categoria',   label: 'Categoría',   field: 'categoria',   sortable: true },
  { name: 'referencia',  label: 'Propiedad',   field: 'referencia'  },
  { name: 'proveedor',   label: 'Proveedor',   field: 'proveedor'   },
  { name: 'importe',     label: 'Importe',     field: 'importe',     sortable: true },
  { name: 'acciones',    label: '',            field: 'acciones'    },
]

const totalGastos  = computed(() => gastos.value.reduce((s,g) => s + parseFloat(g.importe||0), 0))
const resumenCats  = computed(() => {
  const map = {}
  gastos.value.forEach(g => {
    if (!map[g.categoria]) map[g.categoria] = 0
    map[g.categoria] += parseFloat(g.importe || 0)
  })
  return Object.entries(map).map(([categoria, total]) => ({ categoria, total }))
})

const catColor = (c) => ({ peritaje:'purple', marketing:'blue', notaria:'orange', juridico:'teal', otro:'grey' }[c] || 'grey')
const catIcon  = (c) => ({ peritaje:'manage_search', marketing:'campaign', notaria:'gavel', juridico:'balance', otro:'receipt' }[c] || 'receipt')
const fmt = (v) => v ? new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(v) : '—'

async function loadGastos() {
  loading.value = true
  try {
    const params = {}
    if (filtroCategoria.value) params.categoria = filtroCategoria.value
    if (filtroDesde.value)     params.desde      = filtroDesde.value
    const { data } = await api.get('/expenses', { params })
    gastos.value = data
  } finally { loading.value = false }
}

function openForm() { form.value = { categoria: 'otro', fecha: new Date().toISOString().slice(0,10) }; showForm.value = true }

async function save() {
  saving.value = true
  try {
    await api.post('/expenses', form.value)
    $q.notify({ type: 'positive', message: 'Gasto registrado' })
    showForm.value = false; loadGastos()
  } catch (e) { $q.notify({ type: 'negative', message: e.response?.data?.error || 'Error' })
  } finally { saving.value = false }
}

async function eliminar(id) {
  $q.dialog({ title:'Confirmar', message:'¿Eliminar este gasto?', cancel:true, ok:{label:'Eliminar',color:'negative',flat:true} })
    .onOk(async () => {
      await api.delete(`/expenses/${id}`)
      $q.notify({ type: 'positive', message: 'Gasto eliminado' })
      loadGastos()
    })
}

onMounted(loadGastos)
</script>

<style scoped>
.page-content { padding: 1.25rem; }
.page-header  { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 1rem; }
.page-title   { font-size: 1.4rem; font-weight: 800; color: #e2e8f0; margin: 0; }
.page-sub     { font-size: .8rem; color: #64748b; margin: .2rem 0 0; }
.add-btn      { border-radius: 8px; }

.gastos-summary { display: flex; gap: .75rem; flex-wrap: wrap; margin-bottom: 1rem; }
.cat-chip { display: flex; align-items: center; gap: .6rem; padding: .7rem 1rem; }
.cat-nombre { font-size: .72rem; color: #64748b; text-transform: capitalize; }
.cat-total  { font-size: 1rem; font-weight: 700; color: #e2e8f0; }

.table-toolbar { display: flex; align-items: center; gap: .75rem; flex-wrap: wrap; padding: .75rem 1rem; border-bottom: 1px solid var(--color-border); margin-bottom: .5rem; }
.total-gastos  { font-size: .85rem; color: #94a3b8; }
.total-gastos strong { color: #f87171; }
</style>
