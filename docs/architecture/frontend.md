# Arquitectura Frontend

Frontend basado en **Angular** con estructura modular.

## Enfoque arquitectónico
Arquitectura **modular por features** con separación de **core** e **infrastructure**, lo que la convierte en un enfoque **híbrido** entre organización por dominio y separación por capas:
- **Features**: funcionalidades agrupadas por dominio (auth, mensajes, perfiles, búsqueda).
- **Core**: servicios base, auth, interceptores y utilidades transversales.
- **Infrastructure**: acceso a API y adaptadores.
- **Shared/Layout**: componentes reutilizables y estructura de UI.

Este enfoque permite escalar funcionalidades sin mezclar responsabilidades y mantiene el acceso a datos y la UI claramente separados.

## Estructura principal
- `src/main.ts`: bootstrap de la aplicación.
- `src/app/app.ts`, `app.routes.ts`, `app.config.ts`: composición de la app y rutas.
- `src/app/core/`: servicios base, auth, interceptores, realtime y utilidades.
- `src/app/features/`: funcionalidades por dominio (auth, mensajes, onboarding, perfiles, búsqueda).
- `src/app/infrastructure/`: capa de acceso a API y adaptadores.
- `src/app/layout/`: layout, navegación y paneles.
- `src/app/shared/`: componentes reutilizables y utilidades comunes.
- `src/styles.css`: tema global, variables y capas Tailwind/PrimeNG.

## Flujo de datos
1. **UI (features/layout/shared)** dispara acciones.
2. **Core/infrastructure** gestiona llamadas HTTP y WebSocket.
3. **Servicios** adaptan los datos a modelos de UI.
4. **Componentes** renderizan y actualizan estado.

## Integraciones clave
- **API REST** configurada vía `NG_APP_API_URL`.
- **InsForge** (auth) configurado por `NG_APP_INSFORGE_URL` y `NG_APP_INSFORGE_API_KEY`.
- **Autocompletado de ciudades**: `core/location/city-search.service.ts` consume `/cities/search` (dataset local, instantáneo) con debounce y mínimo de caracteres; el fallback `/cities/search/extended` (Nominatim) solo se dispara por acción explícita del usuario y es tolerante a fallos.

## Estilos y componentes
Se utilizan **Tailwind CSS** y **PrimeNG** con una guía de estilos centralizada en `src/styles.css`.
