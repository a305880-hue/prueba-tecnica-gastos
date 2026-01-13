<script setup lang="ts">
import { ref, reactive, computed } from 'vue'

// Estructura del Gasto
interface Expense {
  id: number;
  description: string;
  amount: number;
  category: string;
  date: string;
}

// Variables
const expenses = ref<Expense[]>([])
const loading = ref(false)

// Formulario
const state = reactive({
  description: undefined,
  amount: undefined,
  category: undefined
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

// --- LÓGICA NUEVA: Calcular el Total ---
const totalAmount = computed(() => {
  return expenses.value.reduce((sum, item) => sum + Number(item.amount), 0)
})

// 1. Cargar Gastos
async function fetchExpenses() {
  loading.value = true
  try {
    const res = await fetch('http://localhost:3000/api/expenses')
    const rawData = await res.json()
    
    // Formatear fecha y hora para Chihuahua
    expenses.value = rawData.map((e: any) => ({
      ...e,
      date: new Date(e.date).toLocaleString('es-MX', { 
        timeZone: 'America/Chihuahua',
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true
      })
    }))
    
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}

// 2. Guardar Gasto
async function saveExpense() {
  if (!state.description || !state.amount || !state.category) {
    alert('Por favor llena todos los campos')
    return
  }

  try {
    await fetch('http://localhost:3000/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state)
    })
    
    // Limpiar formulario
    state.description = undefined
    state.amount = undefined
    state.category = undefined
    
    // Recargar tabla
    fetchExpenses() 
  } catch (error) {
    console.error(error)
  }
}

// 3. Eliminar Gasto
async function deleteExpense(id: number) {
  if (!confirm('¿Seguro que quieres borrar este gasto?')) return

  try {
    await fetch(`http://localhost:3000/api/expenses/${id}`, {
      method: 'DELETE'
    })
    fetchExpenses() 
  } catch (error) {
    console.error(error)
  }
}

// Cargar al inicio
fetchExpenses()
</script>

<template>
  <UContainer class="py-10 space-y-8">
    
    <UCard class="bg-primary-50 dark:bg-primary-900/20">
      <div class="text-center">
        <p class="text-gray-500 font-medium">Total Gastado</p>
        <h2 class="text-4xl font-bold text-primary-600">
          ${{ totalAmount.toFixed(2) }}
        </h2>
      </div>
    </UCard>
    
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <span class="text-3xl">💰</span>
          <h1 class="text-2xl font-bold text-primary-500">Historial de Gastos</h1>
        </div>
      </template>

      <UTable 
        :data="expenses" 
        :columns="columns" 
        :loading="loading" 
        class="w-full"
      >
        <template #actions-cell="{ row }">
          <UButton 
            color="red" 
            variant="ghost" 
            icon="i-heroicons-trash" 
            size="xs"
            @click="deleteExpense(row.original.id)" 
          />
        </template>
      </UTable>
      
      <div v-if="expenses.length === 0" class="text-center text-gray-500 py-4">
        No hay gastos registrados aún.
      </div>
    </UCard>

    <UCard>
      <template #header>
        <h3 class="text-lg font-bold text-gray-700">➕ Agregar Nuevo Gasto</h3>
      </template>

      <form @submit.prevent="saveExpense" class="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        
        <UFormGroup label="Descripción" class="md:col-span-2">
          <UInput v-model="state.description" placeholder="Ej. Tacos al pastor" icon="i-heroicons-pencil" />
        </UFormGroup>

        <UFormGroup label="Monto">
          <UInput v-model="state.amount" type="number" placeholder="0.00" icon="i-heroicons-currency-dollar" />
        </UFormGroup>

        <UFormGroup label="Categoría">
          <USelectMenu 
            v-model="state.category" 
            :items="categories" 
            placeholder="Selecciona una categoría" 
            icon="i-heroicons-tag"
          />
        </UFormGroup>

        <div class="md:col-span-4 flex justify-end mt-2">
          <UButton type="submit" color="primary" size="lg" icon="i-heroicons-check">
            Guardar Gasto
          </UButton>
        </div>

      </form>
    </UCard>

  </UContainer>
</template>