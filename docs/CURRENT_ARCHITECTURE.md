# Arquitectura actual

Estado: primera versión local, 24 de septiembre de 2026.

## Stack y flujo

- Frontend: React 18, TypeScript y Vite; build servido por FastAPI. Rutas tipadas en `frontend/src/router.tsx`.
- Backend: FastAPI, httpx, Pillow, SQLite versionado con migración SQL y archivos privados en disco.
- Identidad: registro/login local; scrypt; cookie de sesión `HttpOnly`, `SameSite=Strict`; CSRF.
- Generación: navegador → `/api/generate` autenticado → Microsoft Foundry FLUX.2-pro → imagen validada → almacenamiento privado → galería del usuario.
- Imágenes de inspiración: solicitudes directas del navegador a Unsplash; no forman parte de la generación ni de los datos privados.
- Despliegue: solo local comprobado. No hay staging ni producción de este proyecto.

## Entradas y datos

- Entradas públicas: `/`, `/assets/*`, `/login`, `/register`, `/health`, `/api/register`, `/api/login`.
- Rutas de interfaz privadas: `/app/create`, `/app/library`; React redirige al login y la API protege los datos en el servidor.
- Entradas privadas: `/api/me`, `/api/logout`, `/api/images`, `/api/images/{id}/file`, `/api/generate`.
- Datos sensibles: correo, hash de contraseña, identificador de sesión, prompt, referencias e imágenes generadas, clave Foundry.
- Clave Foundry: solo variable `FOUNDRY_API_KEY` del backend; nunca se envía al navegador.
- Logs disponibles: tabla local `events` con registro/login, logout y resultados de generación. No hay todavía exportador SIEM.

## Controles y límites

Hay validación de entradas, autorización por dueño de imagen, CSRF, control de origen, límites básicos y cabeceras de seguridad. Los límites están en memoria y el almacenamiento es local; deben reemplazarse o reforzarse para despliegue distribuido. La configuración de DNS, CDN, WAF, rate limiting de infraestructura y telemetría de plataforma está pendiente de elegir proveedor y desplegar staging.

Las referencias se optimizan en el navegador y se validan de nuevo en el backend. Las pruebas automatizadas usan bases de datos temporales, separadas de las cuentas locales.
