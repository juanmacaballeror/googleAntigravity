# CRM Inmobiliario — Google Antigravity

CRM Fullstack premium para gestión inmobiliaria.

## Tecnologías
- **Frontend**: Vue 3, Quasar, Pinia, Vite.
- **Backend**: Node.js, Express, PostgreSQL.
- **Utilidades**: pdfmake, axios, chart.js.

## Estructura
- `/frontend`: Aplicación cliente (Quasar + Vite).
- `/backend`: API REST y gestión de base de datos.
- `/backend/db`: Esquemas y scripts SQL.

## Instalación

### Backend
1. `cd backend`
2. `npm install`
3. Configura el `.env`
4. `npm run db:seed` (requiere PostgreSQL corriendo)
5. `npm run dev`

### Frontend
1. `cd frontend`
2. `npm install`
3. `npm run dev` (abre en http://localhost:9000)
