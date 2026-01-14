<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'

// Configuración Inteligente para la Nube ---
const config = useRuntimeConfig()
const api = config.public.apiBase

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

// Variables de Control
const q = ref('')         
const page = ref(1)       
const limit = 10          
const editingId = ref<number | null>(null)

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

const totalAmount = computed(() => {
  return expenses.value.reduce((sum, item) => sum + Number(item.amount), 0)
})

// --- CARGAR DATOS (URL Dinámica) ---
async function fetchExpenses() {
  loading.value = true
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
  } finally {
    loading.value = false
  }
}

watch([page, q], () => {
  fetchExpenses()
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
    alert('Por favor llena todos los campos')
    return
  }

  try {
    if (editingId.value) {
      // PATCH
      await fetch(`${api}/api/expenses/${editingId.value}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state)
      })
    } else {
      // POST
      await fetch(`${api}/api/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state)
      })
    }
    
    cancelEdit()
    fetchExpenses() 
  } catch (error) {
    console.error(error)
    alert('Error al guardar')
  }
}

// --- ELIMINAR (URL Dinámica) ---
async function deleteExpense(id: number) {
  if (!confirm('¿Seguro que quieres borrar este gasto?')) return
  try {
    await fetch(`${api}/api/expenses/${id}`, { method: 'DELETE' })
    fetchExpenses() 
  } catch (error) {
    console.error(error)
  }
}

fetchExpenses()
</script>

<template>
  <UContainer class="py-10 space-y-8">
    
    <UCard class="bg-primary-50 dark:bg-primary-900/20 border-primary-200">
      <div class="text-center">
        <p class="text-gray-500 font-medium">Total Gastado</p>
        <h2 class="text-4xl font-bold text-primary-600">
          ${{ totalAmount.toFixed(2) }}
        </h2>
      </div>
    </UCard>
    
    <UCard>
      <template #header>
        <div class="flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 class="text-xl font-bold text-gray-700">Historial de Gastos</h1>
          <UInput v-model="q" icon="i-heroicons-magnifying-glass" placeholder="Buscar..." />
        </div>
      </template>

      <UTable :data="expenses" :columns="columns" :loading="loading">
        <template #actions-cell="{ row }">
          <div class="flex gap-2">
            <UButton 
              color="amber" 
              variant="ghost" 
              icon="i-heroicons-pencil-square" 
              size="xs"
              @click="startEdit(row.original)" 
            />
            
            <UButton 
              color="red" 
              variant="ghost" 
              icon="i-heroicons-trash" 
              size="xs"
              @click="deleteExpense(row.original.id)" 
            />
          </div>
        </template>
      </UTable>
      
      <div class="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
        <UButton :disabled="page <= 1" @click="page--" variant="soft">Anterior</UButton>
        <span class="text-sm text-gray-500">Página {{ page }}</span>
        <UButton :disabled="expenses.length < limit" @click="page++" variant="soft">Siguiente</UButton>
      </div>
    </UCard>

    <UCard :class="{'border-amber-400 border-2': editingId}">
      <template #header>
        <div class="flex justify-between items-center">
          <h3 class="text-lg font-bold" :class="editingId ? 'text-amber-600' : 'text-gray-700'">
            {{ editingId ? '✏️ Editando Gasto #' + editingId : '➕ Agregar Nuevo Gasto' }}
          </h3>
          <UButton v-if="editingId" @click="cancelEdit" color="gray" variant="ghost" size="sm">
            Cancelar Edición
          </UButton>
        </div>
      </template>

      <form @submit.prevent="saveExpense" class="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <UFormGroup label="Descripción" class="md:col-span-2">
          <UInput v-model="state.description" />
        </UFormGroup>

        <UFormGroup label="Monto">
          <UInput v-model="state.amount" type="number" />
        </UFormGroup>

        <UFormGroup label="Categoría">
          <USelectMenu v-model="state.category" :items="categories" />
        </UFormGroup>

        <div class="md:col-span-4 flex justify-end mt-2">
          <UButton 
            type="submit" 
            :color="editingId ? 'amber' : 'primary'" 
            size="lg" 
            :icon="editingId ? 'i-heroicons-arrow-path' : 'i-heroicons-check'"
          >
            {{ editingId ? 'Actualizar Gasto' : 'Guardar Gasto' }}
          </UButton>
        </div>
      </form>
    </UCard>

  </UContainer>
</template>