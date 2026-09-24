# Flux Secure Studio

Sitio de generación de imágenes con frontend React + TypeScript, rutas privadas, cuentas reales y backend FastAPI. La integración usa el flujo comprobado en `flux_studio_v2.py`: solicitud a FLUX.2-pro de Microsoft Foundry con prompt, dimensiones, seed y hasta dos referencias; respuesta `b64_json`. **Este repositorio no incluye claves ni imágenes privadas.**

## Arquitectura actual

```text
React + TypeScript → FastAPI (sesión, CSRF, autorización) → Microsoft Foundry
                         ↓
                    SQLite + imágenes privadas en disco
```

La galería de inspiración usa imágenes públicas de Unsplash solicitadas a 3840 px. Su disponibilidad y resolución real dependen del proveedor. No se hace scraping ni se incorporan estas imágenes al repositorio.

## Ejecutar localmente

Requiere Python 3.10 o posterior y Node.js 18 o posterior.

```powershell
cd flux-secure-studio
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
cd frontend
npm ci
npm run build
cd ..
```

Configura en `.env` una **clave nueva** en `FOUNDRY_API_KEY` y tu URL de Foundry en `FOUNDRY_ENDPOINT`. No uses ni publiques la clave que apareció en el README del prototipo anterior. Para ejecutar:

```powershell
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Abre `http://127.0.0.1:8000`. Sin configuración de Foundry funcionan las cuentas y el dashboard; la generación responde 503 de forma explícita.

El formulario optimiza referencias JPG, PNG o WebP a JPEG de hasta 1024 px antes de enviarlas. El backend vuelve a validar el archivo y admite hasta 6 MB por referencia y 15 MB por solicitud.

FastAPI sirve el build de React. Para desarrollar con Vite, ejecuta el backend en 8000 y `npm run dev` dentro de `frontend`; configura `APP_ORIGIN=http://127.0.0.1:5173` durante ese modo. En producción, `APP_ORIGIN` debe coincidir exactamente con el origen público del sitio.

## Pruebas

```powershell
python -m unittest discover -s tests -v
```

## Controles implementados

- Contraseñas con scrypt y sal aleatoria.
- Sesiones aleatorias en cookie `HttpOnly`, `SameSite=Strict`; `Secure` al configurar HTTPS.
- CSRF en operaciones autenticadas y validación de origen.
- Rutas de galería y archivos restringidas al dueño.
- Rutas React `/app/create` y `/app/library` protegidas por sesión; el backend vuelve a comprobar autorización en cada solicitud.
- Validación de prompt, dimensiones, seed y referencias; las referencias se decodifican y reencodean.
- Límites básicos por IP/usuario en memoria para registro, login y generación.
- Cabeceras CSP, `nosniff`, política de referencia, permisos y bloqueo de iframe.
- Auditoría local de acceso y generación sin registrar contraseñas ni claves.

## Límites antes de producción

Esta es una primera versión local con esquema SQLite versionado en `migrations/001_initial.sql`. SQLite, disco local y límites en memoria requieren almacenamiento y controles compartidos para varias instancias. Antes de desplegar: rotar la clave expuesta, usar HTTPS y `COOKIE_SECURE=true`, configurar `APP_ORIGIN`, almacenamiento privado persistente, límites en el edge y copias de seguridad. El contenido generado y los prompts pueden ser sensibles; no deben publicarse como archivos estáticos. La llamada real a Foundry no se ejecuta en las pruebas locales porque requiere una clave válida y consume recursos.

## Errores frecuentes

- **503 Foundry no configurado:** falta una clave nueva o el endpoint es un marcador de ejemplo. Revisa `/health`, que debe indicar `foundry_configured: true` antes de generar.
- **413 Solicitud demasiado grande:** el navegador optimiza las referencias. Si persiste, reduce el archivo original o usa uno de hasta 30 MB y 32 megapíxeles.
- **502 de Foundry:** el mensaje distingue credencial rechazada, cuota, parámetros, conexión o respuesta sin imagen. La auditoría guarda solo la categoría y el código, nunca la clave ni la respuesta completa del proveedor.

## Próximos sprints

1. Staging separado, variables y almacenamiento persistente.
2. Telemetría normalizada y pruebas de controles en staging propio.
3. Ingesta en Splunk y detecciones defensivas.
4. Jev como capa de decisiones estructuradas con revisión humana.
