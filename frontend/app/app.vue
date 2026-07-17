<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'

// Configuración Inteligente para la Nube ---
const config = useRuntimeConfig()
const api = config.public.apiBase

// Notificaciones (toasts) de Nuxt UI
const toast = useToast()

// Tipos
interface Expense {
  id: number;
  description: string;
  amount: number;
  category: string;
  date: string;
}

// Variables de Datos
const expenses = ref<Expense[]>([])
const loading = ref(false)
const saving = ref(false)
const firstLoad = ref(true)

// Aviso de "servidor despertando": el plan gratuito de Render se duerme
// tras 15 min sin visitas y tarda ~1 minuto en responder la primera vez.
const slowLoading = ref(false)
let slowTimer: ReturnType<typeof setTimeout> | null = null

// Variables de Control
const q = ref('')
const page = ref(1)
const limit = 10
const editingId = ref<number | null>(null)
let searchTimer: ReturnType<typeof setTimeout> | null = null

// Formulario
const state = reactive({
  description: undefined as string | undefined,
  amount: undefined as number | undefined,
  category: undefined as string | undefined
})

const categories = ['Comida', 'Transporte', 'Entretenimiento', 'Salud', 'Otros']

const columns = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'description', header: 'Descripción' },
  { accessorKey: 'category', header: 'Categoría' },
  { accessorKey: 'amount', header: 'Monto' },
  { accessorKey: 'date', header: 'Fecha' },
  { accessorKey: 'actions', header: 'Acciones' }
]

// Suma solo los gastos visibles en la página actual
const totalAmount = computed(() => {
  return expenses.value.reduce((sum, item) => sum + Number(item.amount), 0)
})

// --- CARGAR DATOS (URL Dinámica) ---
async function fetchExpenses() {
  loading.value = true
  // Si tarda más de 3 segundos, mostramos el aviso de servidor dormido
  slowTimer = setTimeout(() => {
    if (loading.value) slowLoading.value = true
  }, 3000)

  try {
    let url = ''
    if (q.value) {
      // Usamos ${api} en lugar de escribir localhost
      url = `${api}/api/expenses/search?query=${q.value}`
    } else {
      url = `${api}/api/expenses?page=${page.value}&limit=${limit}`
    }

    const res = await fetch(url)
    const rawData = await res.json()

    expenses.value = rawData.map((e: any) => ({
      ...e,
      date: new Date(e.date).toLocaleString('es-MX', {
        timeZone: 'America/Chihuahua',
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })
    }))
  } catch (error) {
    console.error('Error conectando a:', api, error)
    toast.add({
      title: 'No se pudo conectar con el servidor',
      description: 'Espera unos segundos y recarga la página. Si es la primera visita del día, el servidor puede tardar ~1 minuto en despertar.',
      color: 'error',
      icon: 'i-lucide-triangle-alert'
    })
  } finally {
    loading.value = false
    firstLoad.value = false
    slowLoading.value = false
    if (slowTimer) clearTimeout(slowTimer)
  }
}

// Al cambiar de página recargamos de inmediato
watch(page, () => {
  fetchExpenses()
})

// Al escribir en el buscador esperamos 400ms (para no saturar el servidor)
watch(q, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    if (page.value !== 1) {
      page.value = 1 // el watcher de página se encarga de recargar
    } else {
      fetchExpenses()
    }
  }, 400)
})

// --- MODO EDICIÓN ---
function startEdit(row: any) {
  state.description = row.description
  state.amount = row.amount
  state.category = row.category
  editingId.value = row.id
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
}

function cancelEdit() {
  state.description = undefined
  state.amount = undefined
  state.category = undefined
  editingId.value = null
}

// --- GUARDAR O ACTUALIZAR (URL Dinámica) ---
async function saveExpense() {
  if (!state.description || !state.amount || !state.category) {
    toast.add({
      title: 'Faltan datos',
      description: 'Llena la descripción, el monto y la categoría antes de guardar.',
      color: 'warning',
      icon: 'i-lucide-circle-alert'
    })
    return
  }

  // Evita que se guarde 2 veces si haces doble clic
  if (saving.value) return
  saving.value = true

  try {
    if (editingId.value) {
      // PATCH
      await fetch(`${api}/api/expenses/${editingId.value}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state)
      })
      toast.add({ title: 'Gasto actualizado ✏️', color: 'success' })
    } else {
      // POST
      await fetch(`${api}/api/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state)
      })
      toast.add({ title: 'Gasto guardado ✅', color: 'success' })
    }

    cancelEdit()
    fetchExpenses()
  } catch (error) {
    console.error(error)
    toast.add({
      title: 'Error al guardar',
      description: 'Revisa tu conexión e inténtalo de nuevo.',
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}

// --- ELIMINAR (URL Dinámica) ---
async function deleteExpense(id: number) {
  if (!confirm('¿Seguro que quieres borrar este gasto?')) return
  try {
    await fetch(`${api}/api/expenses/${id}`, { method: 'DELETE' })
    toast.add({ title: 'Gasto eliminado 🗑️', color: 'success' })
    fetchExpenses()
  } catch (error) {
    console.error(error)
    toast.add({ title: 'No se pudo borrar el gasto', color: 'error' })
  }
}

fetchExpenses()
</script>

<template>
  <UApp>
    <UContainer class="py-10 space-y-8">

      <!-- ENCABEZADO: qué es esta página -->
      <div class="text-center space-y-2">
        <h1 class="text-3xl font-bold">💰 Control de Gastos</h1>
        <p class="text-gray-500">
          Registra lo que gastas, búscalo por nombre y edítalo o bórralo cuando quieras.
        </p>
      </div>

      <!-- AVISO: el servidor gratuito tarda en despertar -->
      <UAlert
        v-if="slowLoading"
        icon="i-lucide-clock"
        color="warning"
        variant="soft"
        title="El servidor se está despertando ⏳"
        description="Esta app usa un servidor gratuito que se duerme cuando nadie la visita. La primera carga puede tardar hasta 1 minuto; después todo funciona rápido."
      />

      <!-- TOTAL -->
      <UCard class="bg-primary-50 dark:bg-primary-900/20 border-primary-200">
        <div class="text-center">
          <p class="text-gray-500 font-medium">Total Gastado</p>
          <USkeleton v-if="firstLoad && loading" class="h-10 w-40 mx-auto mt-1" />
          <h2 v-else class="text-4xl font-bold text-primary-600">
            ${{ totalAmount.toFixed(2) }}
          </h2>
          <p class="text-xs text-gray-400 mt-1">
            Suma de los gastos que ves en la página actual.
          </p>
        </div>
      </UCard>

      <!-- HISTORIAL -->
      <UCard>
        <template #header>
          <div class="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h2 class="text-xl font-bold text-gray-700">Historial de Gastos</h2>
              <p class="text-sm text-gray-400">
                Usa ✏️ para editar un gasto o 🗑️ para borrarlo.
              </p>
            </div>
            <UInput
              v-model="q"
              icon="i-lucide-search"
              placeholder="Buscar por descripción (ej: tacos)"
              class="w-full md:w-72"
            />
          </div>
        </template>

        <UTable
          :data="expenses"
          :columns="columns"
          :loading="loading"
          empty="Aún no hay gastos registrados. Agrega el primero con el formulario de abajo ⬇️"
        >
          <template #actions-cell="{ row }">
            <div class="flex gap-2">
              <UTooltip text="Editar este gasto">
                <UButton
                  color="warning"
                  variant="ghost"
                  icon="i-lucide-pencil"
                  size="xs"
                  @click="startEdit(row.original)"
                />
              </UTooltip>

              <UTooltip text="Borrar este gasto">
                <UButton
                  color="error"
                  variant="ghost"
                  icon="i-lucide-trash-2"
                  size="xs"
                  @click="deleteExpense(row.original.id)"
                />
              </UTooltip>
            </div>
          </template>
        </UTable>

        <div class="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
          <UButton :disabled="page <= 1 || !!q" variant="soft" @click="page--">Anterior</UButton>
          <span class="text-sm text-gray-500">
            Página {{ page }} · se muestran {{ limit }} gastos por página
          </span>
          <UButton :disabled="expenses.length < limit || !!q" variant="soft" @click="page++">Siguiente</UButton>
        </div>
      </UCard>

      <!-- FORMULARIO -->
      <UCard :class="{ 'border-amber-400 border-2': editingId }">
        <template #header>
          <div class="flex justify-between items-center">
            <div>
              <h3 class="text-lg font-bold" :class="editingId ? 'text-amber-600' : 'text-gray-700'">
                {{ editingId ? '✏️ Editando Gasto #' + editingId : '➕ Agregar Nuevo Gasto' }}
              </h3>
              <p class="text-sm text-gray-400">
                {{ editingId
                  ? 'Cambia lo que necesites y presiona "Actualizar Gasto".'
                  : 'Llena los 3 campos y presiona "Guardar Gasto" para sumarlo a tu historial.' }}
              </p>
            </div>
            <UButton v-if="editingId" color="neutral" variant="ghost" size="sm" @click="cancelEdit">
              Cancelar Edición
            </UButton>
          </div>
        </template>

        <form class="grid grid-cols-1 md:grid-cols-4 gap-4 items-start" @submit.prevent="saveExpense">
          <UFormField
            label="Descripción"
            help="¿En qué gastaste?"
            class="md:col-span-2"
          >
            <UInput v-model="state.description" placeholder="Ej: Tacos de pastor" class="w-full" />
          </UFormField>

          <UFormField
            label="Monto"
            help="Solo números. Usa punto para centavos"
          >
            <UInput v-model="state.amount" type="number" step="0.01" min="0" placeholder="Ej: 150.50" class="w-full" />
          </UFormField>

          <UFormField
            label="Categoría"
            help="Elige el tipo de gasto"
          >
            <USelectMenu v-model="state.category" :items="categories" placeholder="Ej: Comida" class="w-full" />
          </UFormField>

          <div class="md:col-span-4 flex justify-end mt-2">
            <UButton
              type="submit"
              :color="editingId ? 'warning' : 'primary'"
              size="lg"
              :loading="saving"
              :icon="editingId ? 'i-lucide-refresh-cw' : 'i-lucide-check'"
            >
              {{ editingId ? 'Actualizar Gasto' : 'Guardar Gasto' }}
            </UButton>
          </div>
        </form>
      </UCard>

    </UContainer>
  </UApp>
</template>
