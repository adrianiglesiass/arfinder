# Arquitectura Backend

Backend basado en **FastAPI** con estructura por capas.

## Enfoque arquitectónico
Arquitectura **por capas** con un enfoque **híbrido inspirado en Clean Architecture**:
- **Presentación**: `routes/` y `schemas/` exponen la API y definen contratos.
- **Aplicación**: `services/` concentra la lógica de negocio.
- **Datos/infraestructura**: `repositories/`, `models/`, `db/` y `clients/`.

No es DDD estricto porque no existe un dominio aislado con entidades/agregados independientes del ORM; se prioriza la simplicidad y la claridad del flujo. Este enfoque facilita la mantenibilidad, pruebas y evolución modular sin introducir complejidad extra.

## Estructura de carpetas
- `app/main.py`: inicialización de la app, middleware, routers y healthchecks.
- `app/routes/`: capa de controllers/routers (HTTP y WebSocket).
- `app/services/`: lógica de negocio y orquestación.
- `app/repositories/`: acceso a datos y consultas SQLAlchemy.
- `app/models/`: modelos ORM (SQLAlchemy).
- `app/schemas/`: contratos de entrada/salida (Pydantic).
- `app/db/`: configuración de engine y sesiones.
- `app/core/`: configuración, seguridad, rate limit, excepciones, OpenAPI y realtime.
- `app/clients/`: integraciones externas (Cloudinary).
- `app/data/`: datos estáticos cargados en memoria (dataset local de ciudades, `cities.json`).

## Flujo típico de una petición
1. **Router** valida y enruta la solicitud (`app/routes`).
2. **Dependencias** (auth, rate limit, DB) se resuelven desde `app/core`.
3. **Servicio** aplica reglas de negocio.
4. **Repositorio** ejecuta consultas y devuelve entidades.
5. **Schema** serializa la respuesta final.

## Integraciones externas
- **Ciudades**: la búsqueda se sirve desde un **dataset local** (`app/data/cities.json`, cargado en memoria al arranque por `app/services/city_service.py`), con respuesta instantánea y sin red. **Nominatim** se usa solo como **fallback puntual** para ciudades ausentes en el dataset y únicamente bajo acción explícita del usuario (endpoint `/cities/search/extended`), con caché, timeout y tolerancia a fallos. El dataset se regenera con el script reproducible `scripts/build_cities.py` (nunca en runtime).
- **Cloudinary**: subida de imágenes (`app/clients/storage_client.py`).
- **InsForge**: autenticación/validación de sesiones (configurado en `app/core/security.py` y variables de entorno).

## Tiempo real
El canal WebSocket está expuesto en `/ws/realtime` y utiliza:
- `app/core/realtime.py` para gestión de conexiones y suscripciones.
- `app/routes/realtime.py` como endpoint WebSocket.

## Configuración clave
Toda la configuración se centraliza en `app/core/config.py` y se alimenta desde `backend/.env`.
