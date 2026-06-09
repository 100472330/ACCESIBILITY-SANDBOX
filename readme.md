**Proyecto**
- **Nombre:**: Accessibility Sandbox — plataforma de evaluación de accesibilidad cognitiva.

**Descripción / Description**
- **ES:** Plataforma tipo "sandbox" para crear y evaluar componentes web desde el punto de vista de la accesibilidad cognitiva. Permite a desarrolladores publicar experimentos (A/B o individuales), a moderadores revisar y aprobar tanto cuentas como experimentos y preguntas personalizadas, y a usuarios realizar evaluaciones estructuradas.
- **EN:** A sandbox web platform to create and evaluate UI components for cognitive accessibility. Developers publish experiments (A/B or single), moderators review and approve accounts, experiments and custom questions, and users perform structured evaluations.

**Funcionalidades principales / Main features**
- **Creación de experimentos:** Developers crean experimentos con variantes A/B o individuales.
- **Previsualización segura:** Se usan `iframe sandbox` para renderizar HTML/CSS aislado.
- **Evaluaciones:** Users completan valoraciones (clarity, comprehension, cognitive load) y respuestas a preguntas.
- **Moderación:** Moderators gestionan aprobación de developers, moderan experimentos y validan preguntas personalizadas.
- **Autenticación y roles:** JWT y roles `developer`, `moderator`, `user`.
- **Tests backend:** Suite de pruebas con `Jest` + `Supertest`.

**Tecnologías / Stack**
- **Backend:** Node.js, Express, SQLite (`backend/`).
- **Frontend:** React + Vite (`frontend/`).
- **Auth:** JWT (`jsonwebtoken`).
- **Containerización:** Docker Compose (`docker-compose.yml`).

**Estructura del proyecto / Project structure**
- **`backend/`**: servidor Express, base de datos SQLite, tests (`backend/src`, `backend/src/tests`).
- **`frontend/`**: aplicación React + Vite (`frontend/src`).
- **`docker-compose.yml`**: orquesta `backend` y `frontend`.
- **`.env.example`**: variables de entorno de ejemplo.

**Requisitos previos / Prerequisites**
- **Docker + Docker Compose** (recomendado para despliegue rápido).
- **Node.js** y **npm** (si va a ejecutar localmente sin Docker).

**Configuración del entorno / Environment**
- Copiar y editar variables desde ` .env.example` a un archivo `.env` local (no subirlo):

  - `PORT=4000`
  - `DB_PATH=/app/data/database.sqlite`
  - `JWT_SECRET=change-this-secret`
  - `VITE_API_URL=http://localhost:4000`

- **Nota:** Los valores por defecto son para desarrollo. Cambiar `JWT_SECRET` y credenciales antes de producción.

**Ejecución con Docker Compose / Run with Docker Compose**
- Levantar servicios:

```bash
docker compose up --build
```

- Servicios expuestos por defecto:
  - **Backend:** `http://localhost:4000` (puerto `4000`)
  - **Frontend:** `http://localhost:5173` (puerto `5173`)

**Acceso a la aplicación / Access**
- Abrir en el navegador `http://localhost:5173`.

**Usuario moderador por defecto / Default moderator**
- **Email:** `admin@sandbox.com`
- **Password:** `admin123`
- Creado automáticamente por `backend/src/seed.js`. (Ver [backend/src/seed.js](backend/src/seed.js#L1-L24)).
- **IMPORTANTE:** Estos valores son solo para desarrollo y deben cambiarse en producción.

**Ejecución local sin Docker / Local development (no Docker)**
- Backend:

```bash
cd backend
npm install
cp ../.env.example .env   # editar según necesidades
npm run dev
```

- Frontend:

```bash
cd frontend
npm install
cp ../.env.example .env   # editar VITE_API_URL si es necesario
npm run dev
```

**Ejecución de tests backend / Backend tests**
- Ejecutar la suite de pruebas unitarias e integración:

```bash
cd backend
npm test
```

**Roles del sistema / Roles**
- **`developer`**: crea experimentos, edita y publica sus propios experimentos.
- **`moderator`**: revisa y aprueba cuentas de developers, modera experimentos y preguntas personalizadas.
- **`user`**: participa en evaluaciones publicadas.

**Flujo básico de uso / Basic workflow**
1. `developer` registra cuenta -> queda en `pending` hasta aprobación.
2. `moderator` revisa y aprueba la cuenta y los experimentos.
3. `developer` crea experimento (A/B o individual) y lo publica.
4. `user` accede a la aplicación y realiza evaluaciones sobre experimentos publicados.
5. `developer` y `moderator` consultan resultados y estadísticas.

**Notas de seguridad / Security notes**
- No usar secretos por defecto en producción; establecer `JWT_SECRET` fuerte via entorno.
- No exponer archivos de base de datos ni `.env` en repositorios públicos.
- Recomendado: habilitar HTTPS y políticas CSP cuando se suba en producción.

**Limpieza y archivos a excluir antes de entregar / Clean-up before delivery**
- No incluir en paquetes de entrega los siguientes ficheros/carpetas:
  - `.env` (usar `.env.example` en su lugar)
  - Bases de datos SQLite (`backend/data/*.sqlite`)
  - `node_modules/`
  - `.DS_Store`, `__MACOSX`
  - La carpeta `.git`

**Archivos relevantes consultados**
- `docker-compose.yml` ([docker-compose.yml](docker-compose.yml))
- `.env.example` ([.env.example](.env.example))
- Backend `package.json` ([backend/package.json](backend/package.json))
- Frontend `package.json` ([frontend/package.json](frontend/package.json))
- Seed del moderador ([backend/src/seed.js](backend/src/seed.js#L1-L24))

---
Documento bilingüe breve pensado para un Trabajo Fin de Grado. Si quieres puedo ajustar el tono (más técnico, más didáctico) o añadir secciones (diagramas, instrucciones de despliegue en cloud, checklist de entrega).
