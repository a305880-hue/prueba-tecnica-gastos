<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'

// Configuración Inteligente para la Nube ---
const config = useRuntimeConfig()
const api = config.public.apiBase

// Notificaciones (toasts) de Nuxt UI
const toast = useToast()

// Modo claro / oscuro
const colorMode = useColorMode()
const isDark = computed({
  get: () => colorMode.value === 'dark',
  set: (value: boolean) => {
    colorMode.preference = value ? 'dark' : 'light'
  }
})

// Tipos
interface Expense {
  id: number;
  description: string;
  amount: number;
  category: string;
  date: string;
}

// --- PERFILES ---
// Cada persona elige (o crea) su perfil y solo ve sus propios gastos.
// El navegador recuerda el perfil elegido con localStorage.
const profile = ref<string | null>(null)
const availableProfiles = ref<string[]>([])
const newProfileName = ref('')

// Variables de Datos
const expenses = ref<Expense[]>([])
const grandTotal = ref(0)
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

// --- PERFILES: cargar, elegir y cambiar ---
async function fetchProfiles() {
  try {
    const res = await fetch(`${api}/api/expenses/profiles`)
    availableProfiles.value = await res.json()
  } catch (error) {
    console.error('Error cargando perfiles:', error)
  }
}

function selectProfile(name: string) {
  const clean = name.trim()
  if (!clean) {
    toast.add({ title: 'Escribe un nombre para tu perfil', color: 'warning' })
    return
  }
  profile.value = clean
  localStorage.setItem('gastos-perfil', clean)
  newProfileName.value = ''
  page.value = 1
  q.value = ''
  fetchExpenses()
  fetchTotal()
}

function changeProfile() {
  profile.value = null
  localStorage.removeItem('gastos-perfil')
  expenses.value = []
  grandTotal.value = 0
  firstLoad.value = true
  cancelEdit()
  fetchProfiles()
}

// Al abrir la página: recuperamos el perfil guardado en este navegador
onMounted(() => {
  const saved = localStorage.getItem('gastos-perfil')
  if (saved) {
    profile.value = saved
    fetchExpenses()
    fetchTotal()
  }
  fetchProfiles()
})

// --- CARGAR DATOS (URL Dinámica) ---
async function fetchExpenses() {
  if (!profile.value) return
  loading.value = true
  // Si tarda más de 3 segundos, mostramos el aviso de servidor dormido
  slowTimer = setTimeout(() => {
    if (loading.value) slowLoading.value = true
  }, 3000)

  try {
    const perfil = `profile=${encodeURIComponent(profile.value)}`
    let url = ''
    if (q.value) {
      // Usamos ${api} en lugar de escribir localhost
      url = `${api}/api/expenses/search?query=${encodeURIComponent(q.value)}&${perfil}`
    } else {
      url = `${api}/api/expenses?page=${page.value}&limit=${limit}&${perfil}`
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

// --- TOTAL GLOBAL: suma TODOS los gastos del perfil, no solo la página ---
async function fetchTotal() {
  if (!profile.value) return
  try {
    const res = await fetch(`${api}/api/expenses/total?profile=${encodeURIComponent(profile.value)}`)
    const data = await res.json()
    grandTotal.value = Number(data.total) || 0
  } catch (error) {
    console.error('Error cargando el total:', error)
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
      // POST: el gasto se guarda a nombre del perfil activo
      await fetch(`${api}/api/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...state, profile: profile.value })
      })
      toast.add({ title: 'Gasto guardado ✅', color: 'success' })
    }

    cancelEdit()
    fetchExpenses()
    fetchTotal()
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
    fetchTotal()
  } catch (error) {
    console.error(error)
    toast.add({ title: 'No se pudo borrar el gasto', color: 'error' })
  }
}
</script>

<template>
  <UApp>
    <UContainer class="py-10 space-y-8">

      <!-- BARRA SUPERIOR: perfil activo y modo claro/oscuro -->
      <div class="flex justify-between items-center">
        <UBadge v-if="profile" color="primary" variant="subtle" size="lg">
          👤 {{ profile }}
        </UBadge>
        <div v-else />
        <div class="flex items-center gap-2">
          <UButton
            v-if="profile"
            color="neutral"
            variant="ghost"
            size="sm"
            icon="i-lucide-users"
            @click="changeProfile"
          >
            Cambiar perfil
          </UButton>
          <ClientOnly>
            <UTooltip :text="isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'">
              <UButton
                :icon="isDark ? 'i-lucide-moon' : 'i-lucide-sun'"
                color="neutral"
                variant="ghost"
                @click="isDark = !isDark"
              />
            </UTooltip>
            <template #fallback>
              <div class="w-8 h-8" />
            </template>
          </ClientOnly>
        </div>
      </div>

      <!-- ENCABEZADO: qué es esta página -->
      <div class="text-center space-y-2">
        <h1 class="text-3xl font-bold">💰 Control de Gastos</h1>
        <p class="text-gray-500 dark:text-gray-400">
          Registra lo que gastas, búscalo por nombre y edítalo o bórralo cuando quieras.
        </p>
      </div>

      <!-- PANTALLA DE PERFILES: cada quien ve solo sus gastos -->
      <UCard v-if="!profile" class="max-w-lg mx-auto">
        <template #header>
          <h2 class="text-xl font-bold text-gray-700 dark:text-gray-200 text-center">
            ¿Quién está usando la app? 👤
          </h2>
          <p class="text-sm text-gray-400 text-center mt-1">
            Elige tu perfil para ver únicamente tus gastos. Cada perfil tiene su propia lista y su propio total.
          </p>
        </template>

        <div class="space-y-6">
          <div v-if="availableProfiles.length">
            <p class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Perfiles existentes:</p>
            <div class="flex flex-wrap gap-2">
              <UButton
                v-for="p in availableProfiles"
                :key="p"
                color="primary"
                variant="soft"
                icon="i-lucide-user"
                @click="selectProfile(p)"
              >
                {{ p }}
              </UButton>
            </div>
          </div>

          <UFormField
            label="Crear un perfil nuevo"
            help="Escribe tu nombre y presiona Entrar"
          >
            <div class="flex gap-2">
              <UInput
                v-model="newProfileName"
                placeholder="Ej: Sebastian"
                class="flex-1"
                @keyup.enter="selectProfile(newProfileName)"
              />
              <UButton icon="i-lucide-plus" @click="selectProfile(newProfileName)">
                Entrar
              </UButton>
            </div>
          </UFormField>
        </div>
      </UCard>

      <!-- APP PRINCIPAL: solo se muestra con un perfil elegido -->
      <template v-else>

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
            <p class="text-gray-500 dark:text-gray-400 font-medium">Total Gastado</p>
            <USkeleton v-if="firstLoad && loading" class="h-10 w-40 mx-auto mt-1" />
            <h2 v-else class="text-4xl font-bold text-primary-600">
              ${{ grandTotal.toFixed(2) }}
            </h2>
            <p class="text-xs text-gray-400 mt-1">
              Suma de TODOS los gastos de {{ profile }}, incluyendo los de otras páginas.
            </p>
          </div>
        </UCard>

        <!-- HISTORIAL -->
        <UCard>
          <template #header>
            <div class="flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <h2 class="text-xl font-bold text-gray-700 dark:text-gray-200">Historial de Gastos</h2>
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

          <div class="flex justify-between items-center mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            <UButton :disabled="page <= 1 || !!q" variant="soft" @click="page--">Anterior</UButton>
            <span class="text-sm text-gray-500 dark:text-gray-400">
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
                <h3 class="text-lg font-bold" :class="editingId ? 'text-amber-600' : 'text-gray-700 dark:text-gray-200'">
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

      </template>

    </UContainer>
  </UApp>
</template>
