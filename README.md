<div align="center">
  <h1>
    <img src="frontend/public/favicon.svg" alt="Arfinder" height="30" align="absmiddle" />rfinder
  </h1>
  <p>Encuentra compañero de piso. Crea tu perfil, explora con filtros y habla en tiempo real.</p>
</div>

## Demo

<div align="center">
  <video src="https://github.com/user-attachments/assets/57d673c0-7890-4862-8fc7-107c23a848cb" width="300" controls></video>
</div>

## Índice

1. [¿Por qué este proyecto?](#por-qué-este-proyecto)
2. [Características](#características)
3. [Tecnologías](#tecnologías)
4. [Requisitos](#requisitos)
5. [Instalación](#instalación)
6. [Configuración](#configuración)
7. [Ejecución en local](#ejecución-en-local)
8. [Endpoints principales](#endpoints-principales)
9. [Estructura del repositorio](#estructura-del-repositorio)
10. [Documentación](#documentación)
11. [Licencia](#licencia)

## ¿Por qué este proyecto?

Buscar piso compartido suele reducirse a listados fríos de anuncios donde apenas sabes nada de la persona
con la que vas a convivir. Arfinder le da la vuelta: lo importante no es el anuncio, son las personas.
Cada usuario tiene un perfil con fotos y preferencias de convivencia (presupuesto, horarios, mascotas,
hábitos…), puedes filtrar por compatibilidad y, cuando alguien encaja, hablar al instante por un
chat en tiempo real.

## Características

- Registro y autenticación con verificación de email.
- Onboarding guiado para crear el perfil con fotos.
- Explorar perfiles con filtros de compatibilidad (presupuesto, horarios, mascotas, tipo, género, edad…).
- Autocompletado de ciudad servido desde un dataset local (respuesta instantánea) con fallback a Nominatim
  solo bajo acción explícita.
- Chat y notificaciones en tiempo real (WebSocket).
- Gestión de fotos de perfil con almacenamiento en la nube.
- Navegación pública de perfiles y explorar sin iniciar sesión.

## Tecnologías

<div align="center">
  <table>
    <tr>
      <td align="center" width="140">
        <img src="https://cdn.simpleicons.org/python/3776AB" alt="Python" height="28" />
        <br />
        <strong>Python</strong>
      </td>
      <td align="center" width="140">
        <img src="https://cdn.simpleicons.org/fastapi/009688" alt="FastAPI" height="28" />
        <br />
        <strong>FastAPI</strong>
      </td>
      <td align="center" width="140">
        <img src="https://cdn.simpleicons.org/sqlalchemy/D71F00" alt="SQLAlchemy" height="28" />
        <br />
        <strong>SQLAlchemy</strong>
      </td>
      <td align="center" width="140">
        <img src="https://cdn.simpleicons.org/postgresql/4169E1" alt="PostgreSQL" height="28" />
        <br />
        <strong>PostgreSQL</strong>
      </td>
    </tr>
    <tr>
      <td align="center" width="140">
        <img src="https://cdn.simpleicons.org/angular/DD0031" alt="Angular" height="28" />
        <br />
        <strong>Angular</strong>
      </td>
      <td align="center" width="140">
        <img src="https://cdn.simpleicons.org/typescript/3178C6" alt="TypeScript" height="28" />
        <br />
        <strong>TypeScript</strong>
      </td>
      <td align="center" width="140">
        <img src="https://cdn.simpleicons.org/tailwindcss/38B2AC" alt="Tailwind CSS" height="28" />
        <br />
        <strong>Tailwind CSS</strong>
      </td>
      <td align="center" width="140">
        <img src="https://cdn.simpleicons.org/primeng/6F42C1" alt="PrimeNG" height="28" />
        <br />
        <strong>PrimeNG</strong>
      </td>
    </tr>
  </table>
</div>

## Requisitos

- Python 3.11+ y pip
- Node.js 20+ y npm
- Docker y Docker Compose (para la base de datos local)

## Instalación

```bash
git clone https://github.com/adrianiglesiass/arfinder.git
cd arfinder
```

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
```

## Configuración

### Backend (`backend/.env`)

Copia `backend/.env.example` a `.env` y rellena los valores. El listado completo de variables y sus
descripciones está en ese fichero y en `app/core/config.py`.

Ejemplo de `DATABASE_URL` (docker-compose):
`postgresql+psycopg2://arfinder_user:<password>@localhost:5432/arfinder_db`

### Frontend (`frontend/.env`)

Copia `frontend/.env.example` a `.env` y rellena los valores. El script `npm run config` genera
`src/environments/environment.ts` a partir de este archivo.

## Ejecución en local

### Base de datos (PostgreSQL)

```bash
cd backend
docker compose up -d
```

### Backend

```bash
cd backend
make migrate
make seed
make dev
```

API disponible en `http://localhost:8000`  
Documentación OpenAPI/Swagger en `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
npm run start
```

Aplicación en `http://localhost:4200`

## Endpoints principales

- `GET /profiles` Búsqueda de perfiles con filtros
- `GET /profiles/me` Perfil del usuario autenticado
- `POST /conversations` Crear o recuperar conversación
- `GET /conversations/{id}/messages` Mensajes de una conversación
- `POST /conversations/{id}/messages` Enviar mensaje
- `GET /cities/search` Búsqueda de ciudades desde el dataset local
- `GET /cities/search/extended` Fallback a Nominatim (solo por acción explícita del usuario)
- `GET /health` Healthcheck
- `GET /health/realtime` Estado del sistema realtime
- `WS /ws/realtime` Canal de tiempo real (WebSocket)

## Estructura del repositorio

```
arfinder/
├── backend/                 API FastAPI
│   ├── app/
│   │   ├── routes/          auth · cities · conversations · messages · profile · realtime
│   │   ├── services/        lógica de negocio (incl. city_service: dataset local + fallback)
│   │   ├── repositories/    acceso a datos (SQLAlchemy)
│   │   ├── schemas/         modelos Pydantic
│   │   ├── core/            config, seguridad, rate limiting, realtime
│   │   └── data/            cities.json (dataset local de ciudades)
│   └── scripts/             utilidades (build_cities.py, seed.py)
│
├── frontend/                Aplicación Angular
│   └── src/app/
│       ├── core/            guards, servicios de dominio, location
│       ├── infrastructure/  clientes de API (auth, city, conversation, profile…)
│       ├── features/
│       │   ├── auth/         login, registro, verificación de email, callback
│       │   ├── onboarding/   creación de perfil paso a paso
│       │   ├── profile/      ver y editar perfil
│       │   ├── search-profile/  explorar perfiles con filtros
│       │   └── messages/     chat en tiempo real
│       ├── layout/          shell raíz (navbar + router outlet)
│       └── shared/          componentes reutilizables (city-autocomplete, etc.)
│
└── docs/                    documentación técnica, memoria y presentación
```

## Documentación

- Arquitectura backend: `docs/architecture/backend.md`
- Arquitectura frontend: `docs/architecture/frontend.md`
- Modelo relacional: `docs/database/modelo-relacional-info.md`
- Diagrama EER: `docs/database/EER.drawio.png`
- Memoria del proyecto: `docs/memoria/`

## Licencia

Distribuido bajo licencia MIT. Ver [`LICENSE`](LICENSE).
