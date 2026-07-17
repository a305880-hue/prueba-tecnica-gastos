# Sistema de Control de Gastos 💰

Aplicación Full Stack para administrar gastos personales, filtrarlos y visualizarlos.

## 🚀 Enlaces del Despliegue
* **Frontend:** https://prueba-tecnica-gastos.vercel.app
* **Backend:** https://prueba-tecnica-gastos.onrender.com

## 🛠️ Tecnologías
* **Backend:** NestJS, TypeORM, PostgreSQL.
* **Frontend:** Vue 3, Nuxt UI, TailwindCSS.

## ⚙️ Instalación Local
1. Clonar el repositorio.
2. Configurar `.env` basado en los ejemplos.
3. Backend: `cd backend && npm install && npm run start:dev`
4. Frontend: `cd frontend && npm install && npm run dev`

## 🧪 Datos de Prueba
Puedes generar 10 gastos automáticos visitando: `/api/expenses/seed` (opcional: `?profile=TuNombre`).

## 👤 Perfiles
Cada persona elige o crea un perfil al entrar y solo ve sus propios gastos.
El navegador recuerda el perfil elegido. Endpoints relacionados:
* `GET /api/expenses/profiles` — lista los perfiles existentes.
* `GET /api/expenses/total?profile=X` — total de TODOS los gastos del perfil.
* Los endpoints de listado y búsqueda aceptan `&profile=X` para filtrar.

## 🌗 Tema
La interfaz incluye botón para alternar entre modo claro y oscuro.