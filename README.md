# Adaptive Security Orchestrator & AI Creative Studio

<p align="center">
  <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80" alt="Adaptive Security Orchestrator Banner" width="100%" style="border-radius: 12px; max-height: 380px; object-fit: cover;" />
</p>

<p align="center">
  <strong>Laboratorio local de generación de imágenes con FLUX.2-pro, React, controles de seguridad verificables, telemetría y análisis opcional con Jev.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-5.4-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/TailwindCSS-3.4-38BDF8?logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Node.js-22.x-339933?logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/Sharp-High--Speed%20Imaging-990000" alt="Sharp" />
  <img src="https://img.shields.io/badge/FLUX.2--pro-Microsoft%20Foundry-7928CA" alt="FLUX.2-pro" />
  <img src="https://img.shields.io/badge/Security-Hardened%20API%20%2B%20Telemetry-10B981" alt="Security" />
  <img src="https://img.shields.io/badge/Tests-Backend%20validated-brightgreen" alt="Tests" />
</p>

---

## 📑 Tabla de Contenidos
- [Descripción General](#-descripción-general)
- [Arquitectura del Sistema](#-arquitectura-del-sistema)
- [Pilares de Seguridad Adaptativa y Telemetría](#-pilares-de-seguridad-adaptativa-y-telemetría)
- [Seguridad del laboratorio y arquitectura teórica](#-seguridad-del-laboratorio-y-arquitectura-teórica)
- [Módulos Principales](#-módulos-principales)
  - [1. Creative AI Studio & FLUX.2-pro](#1-creative-ai-studio--flux2-pro)
  - [2. Editor Pro (Lienzo HTML5 Canvas 2D)](#2-editor-pro-lienzo-html5-canvas-2d)
  - [3. Catálogo Maestro 4K UHD](#3-catálogo-maestro-4k-uhd)
  - [4. Bóveda Privada de Medios](#4-bóveda-privada-de-medios)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Requisitos Previos](#-requisitos-previos)
- [Guía de Instalación y Puesta en Marcha](#-guía-de-instalación-y-puesta-en-marcha)
- [Variables de Entorno](#-variables-de-entorno)
- [Referencia de la API](#-referencia-de-la-api)
- [Suite de Pruebas Automatizadas](#-suite-de-pruebas-automatizadas)
- [Avisos de Seguridad](#-avisos-de-seguridad)
- [Licencia](#-licencia)

---

## 🌟 Descripción General

**Adaptive Security Orchestrator** es un laboratorio local de generación y edición de imágenes con **FLUX.2-pro**, React y Node.js/TypeScript. Demuestra controles de seguridad en la aplicación y una integración opcional con Jev para analizar eventos.

La arquitectura de seguridad está diseñada por fases incrementales:
1. **Fase 1 (Implementada y Verificable)**: Endurecimiento de acceso HTTP, autenticación obligatoria previa a la recepción de ficheros (`requireUploadAuth`), cuotas horarias de generación, origen exacto, aislamiento multi-inquilino y registro local estructurado de telemetría en JSONL con identificadores unívocos por petición (`X-Request-ID`).
2. **Fase 2 (Integrada en el laboratorio)**: Jev en modo observación mediante la API de TypeSafe y exportación real a Splunk Enterprise local mediante HEC. Splunk es opcional para usar la aplicación.
3. **Extensión teórica**: WAF, VPN administrativa, segmentación de red e IDS se explican como arquitectura empresarial equivalente; no se van a desplegar para este proyecto.

La aplicación se ejecuta localmente con TypeScript y no requiere Python.

---

## 📐 Arquitectura del Sistema

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React 18 + Vite)                      │
│   Tailwind CSS  │  Director Creativo  │  Editor Pro  │  Catálogo 4K    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / Cookies HttpOnly + CSRF
                                    │ Cabecera X-Request-ID en respuestas
┌───────────────────────────────────▼────────────────────────────────────┐
│                    ADAPTIVE SECURITY ORCHESTRATOR                      │
│                                                                        │
│  [ Exact Origin Gateway ] ──► [ Rate Limiter (IP/Cuenta/Gen) ]         │
│               │                                                        │
│               ▼                                                        │
│  [ Pre-Upload Auth Guard ] ──► [ Session & CSRF Verification ]         │
│                                           │                            │
│  ┌─────────────────────────┐              │  ┌──────────────────────┐  │
│  │   Prisma ORM (SQLite)   │              │  │ Sharp Image Pipeline │  │
│  │  - User Authentication  │              │  │ - EXIF Sanitizer     │  │
│  │  - Session Lifecycle    │              │  │ - Identity Pack 2x3  │  │
│  │  - Multi-tenant Images  │              │  └──────────┬───────────┘  │
│  └─────────────────────────┘              │             │              │
│                                           ▼             │              │
│  ┌───────────────────────────────────────────────┐      │              │
│  │ Local Telemetry Logger (security-events.jsonl)│      │              │
│  │ - Request-ID, Path, Status, Tags, IP, Method  │      │              │
│  └───────────────────────┬───────────────────────┘      │              │
└──────────────────────────┼──────────────────────────────┼──────────────┘
                           │ (Ejercicio SIEM opcional)     │ Dual-Auth
                           ▼                              ▼ (Bearer + api-key)
              ┌─────────────────────────┐    ┌─────────────────────────┐
              │  Splunk (opcional)     │    │    Microsoft Foundry    │
              │  Jev: API opcional     │    │      (FLUX.2-pro)       │
              └─────────────────────────┘    └─────────────────────────┘
```

---

## 🛡️ Pilares de Seguridad Adaptativa y Telemetría

El backend incorpora controles defensivos rigurosos en cada capa:

1. **Pre-Autenticación en Carga de Archivos (`requireUploadAuth`)**: La sesión y el token CSRF se verifican *antes* de que Multer procese o reciba streams multipart en memoria, neutralizando vectores de agotamiento de recursos y DoS por clientes anónimos.
2. **Puerta de Enlace de Origen Exacto (`ALLOWED_ORIGINS`)**: Validación estricta contra un conjunto cerrado de orígenes (`APP_ORIGIN`, `DEV_ORIGIN`). Peticiones mutantes (`POST`, `PUT`, `DELETE`) de orígenes no autorizados o sospechosos son rechazadas inmediatamente con `403 Forbidden`.
3. **Límites de Carga y Generación Multinivel**:
   - Límites Multer: máximo 25 MB por archivo, 7 archivos, 20 campos y 30 partes por solicitud.
   - Límites de login: 30 intentos/hora por IP y 10 intentos/hora por cuenta.
   - Cuota de generación: límite horario configurable (`GENERATION_HOURLY_LIMIT`, por defecto 20 generaciones/hora por usuario) para prevenir el drenaje del presupuesto de API.
4. **Telemetría y Registro de Auditoría Local (JSONL)**:
   - Registro en `backend/data/security-events.jsonl` con formato normalizado.
   - Cada solicitud recibe un identificador criptográfico `X-Request-ID` (UUID v4) transmitido en la cabecera HTTP.
   - Registro de `timestamp`, `event_type` (`auth.login_failed`, `image.generation_success`, etc.), `status`, `user_agent` saneado y `security_tags`.
   - **Privacidad y Seguridad de Datos**: El registro **no** almacena prompts, contraseñas, tokens, cookies ni contenido de imágenes.
5. **Ofuscación de Errores de Upstream**: Las respuestas de error de Microsoft Foundry son saneadas; nunca se filtran parámetros internos, esquemas o mensajes de depuración a clientes no autorizados.
6. **Gestión Criptográfica de Identidad**: Hashing de contraseñas mediante `scrypt` derivado en 64 bytes (`N=16384, r=8, p=1`) con sal aleatoria de 16 bytes y comparación en tiempo constante (`timingSafeEqual`).
7. **Sesiones Seguras HttpOnly y CSRF**: Cookies con directivas `HttpOnly`, `SameSite=Lax`, expiración forzada y token criptográfico único de 128 bits verificado en `X-CSRF-Token`.
8. **Aislamiento Multi-inquilino de Archivos**: Acceso a imágenes privadas verificado a nivel de fila en la base de datos contra el `userId` de la sesión.
9. **Saneamiento EXIF y Validación de Resolución**: Procesamiento con **Sharp** que reorienta capturas móviles, purga metadatos, limita la entrada a 32 MP y ajusta las imágenes subidas a un máximo de 4096 píxeles por lado.
10. **Content Security Policy (CSP)**: Cabeceras restrictivas sin `unsafe-eval` ni scripts en línea, permitiendo únicamente orígenes validados y dominios autorizados de Unsplash.

---

## 🧭 Seguridad del laboratorio y arquitectura teórica

Estos documentos relacionan los controles existentes con el diagrama empresarial de referencia:

- 📖 **[Arquitectura local y equivalentes empresariales](docs/SECURITY_ARCHITECTURE.md)**: Distingue los controles reales, incluido Splunk local, de WAF, VPN e IDS teóricos.
- 🤝 **[Integración Jev](docs/JEV_DECISION_CONTRACT.md)**: Describe la llamada real a TypeSafe, el score de severidad, el umbral de revisión y sus límites operativos.
- 📤 **[Exportación a Splunk HEC](docs/SPLUNK_EXPORT.md)**: Explica la configuración, ejecución, cursor y semántica de entrega.

> [!NOTE]
> Jev solo hace llamadas reales si se configura `TYPESAFE_API_KEY`. Splunk Enterprise está integrado como componente local opcional; WAF, VPN e IDS permanecen teóricos.

---

## 🚀 Módulos Principales

### 1. Creative AI Studio & FLUX.2-pro
- **Modos de Generación**:
  - `t2i` (Texto a Imagen): Control total sobre resolución (múltiplos de 16, hasta 2048x2048), aspecto y semilla aleatoria.
  - `copy_pose_outfit` (I2I Guía): Transferencia espacial de pose y vestuario mediante imagen guía.
  - `identity_pack`: Fusión inteligente de 1 a 6 fotos de referencia en cuadrículas (*2×3 o 3×2*) generadas en memoria por **Sharp** para máxima fidelidad de fisonomía facial.
- **Director Creativo**: Inyección asistida de parámetros de cámara (Hasselblad H6D-100c, 85mm f/1.4, Panavision 35mm), iluminación (Golden Hour, Neón Bicolor, Luz Cenital) y tokens anti-defectos.

### 2. Editor Pro (Lienzo HTML5 Canvas 2D)
Suite completa de retoque y post-procesado accesible en `/app/editor`:
- **Ajustes en Tiempo Real**: Brillo, Contraste, Saturación, Calidez, Exposición, Desenfoque gaussiano suave, Viñeta cinematográfica, Grano fílmico e Inversión.
- **8 Presets LUT**: *Natural*, *Teal & Orange*, *Monocromo Noir*, *Golden Hour*, *Cyberpunk Neo*, *Vintage 70s*, *Mate Falso* y *Nieve Ártica*.
- **Transformaciones Geométricas**: Rotación 90° horario/antihorario, volteo horizontal y vertical.
- **Exportación Directa**: Guardar en la biblioteca privada, descargar en PNG nativo o reutilizar como Referencia 1 o Guía en el estudio.
- **Drag & Drop**: Arrastre de imágenes del escritorio directamente sobre el lienzo de trabajo.

### 3. Catálogo Maestro 4K UHD
Galería pública de inspiración con **24 creaciones curadas en ultra alta resolución (3840 px)** clasificadas en Retrato, Arquitectura, Cinematografía, Naturaleza, Arte Digital y Lifestyle, con ficha técnica completa y carga inmediata en el estudio o editor.

### 4. Bóveda Privada de Medios
Panel de control de usuario para almacenar, explorar, reutilizar o eliminar creaciones y fotos personales con total aislamiento y persistencia en SQLite/PostgreSQL a través de Prisma.

---

## 📁 Estructura del Proyecto

```text
adaptive-security-orchestrator/
│
├── backend/                       # Servidor Node.js + TypeScript + Prisma
│   ├── data/
│   │   ├── outputs/               # Almacenamiento seguro de imágenes generadas
│   │   ├── security-events.jsonl  # Registro local de eventos de seguridad y telemetría
│   │   └── studio.sqlite3         # Base de datos SQLite
│   ├── prisma/
│   │   └── schema.prisma          # Esquema relacional tipado (User, Session, Image, Event)
│   ├── src/
│   │   ├── auth.ts                # Criptografía scrypt, sesiones HttpOnly, CSRF
│   │   ├── catalog.ts             # 24 obras maestras en 4K UHD
│   │   ├── db.ts                  # Instancia singleton de PrismaClient
│   │   ├── flux.ts                # Conector a Microsoft Foundry FLUX.2-pro (Dual-Auth)
│   │   ├── imageUtils.ts          # Procesador gráfico Sharp (EXIF, Identity Pack)
│   │   ├── index.ts               # Servidor Express, seguridad, rate limiting y SPA
│   │   └── telemetry.ts           # Middleware de telemetría y request_id
│   ├── tests/
│   │   └── server.test.ts         # Suite automatizada de pruebas en TypeScript
│   ├── .env                       # Variables de entorno y credenciales (fuera de Git)
│   ├── .env.example               # Plantilla de configuración
│   ├── package.json               # Dependencias y scripts del backend
│   └── tsconfig.json              # Configuración TypeScript del backend
│
├── frontend/                      # Cliente web React + TypeScript + Tailwind
│   ├── src/
│   │   ├── App.tsx                # Vistas principales (Studio, Editor Pro, Catálogo, Vault)
│   │   ├── api.ts                 # Cliente HTTP tipado con interceptores
│   │   ├── image.ts               # Utilidades de imagen y canvas en el cliente
│   │   ├── router.tsx             # Enrutador cliente SPA reactivo
│   │   └── style.css              # Sistema de diseño Obsidian con Tailwind CSS
│   ├── postcss.config.js          # Pipeline PostCSS
│   ├── tailwind.config.js         # Configuración del motor Tailwind CSS
│   ├── vite.config.ts             # Empaquetador Vite con proxy inverso
│   ├── package.json               # Dependencias del cliente
│   └── tsconfig.json              # Configuración TypeScript del frontend
│
├── docs/                          # Documentación arquitectónica de seguridad
│   ├── SECURITY_ARCHITECTURE.md   # Arquitectura real y límites del entorno
│   └── JEV_DECISION_CONTRACT.md   # Especificación del contrato con el motor Jev
│
├── .gitignore                     # Exclusión de credenciales, SQLite y outputs
└── README.md                      # Documentación técnica principal
```

---

## 📋 Requisitos Previos

- **Node.js**: Versión `20.x` o `22.x` LTS instalada.
- **npm**: Versión `10.x` o superior.
- **Microsoft Foundry**: Endpoint y API Key válidos para el modelo `FLUX.2-pro`.

---

## 🛠️ Guía de Instalación y Puesta en Marcha

### 1. Clonar el repositorio
```bash
git clone https://github.com/GuamanFrancis/adaptive-security-orchestrator.git
cd adaptive-security-orchestrator
```

### 2. Configurar el Backend
```bash
cd backend

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Edita backend/.env con tus credenciales seguras de Microsoft Foundry

# Generar cliente de Prisma y sincronizar base de datos
npx prisma generate
npx prisma db push
```

### 3. Configurar el Frontend
```bash
cd ../frontend

# Instalar dependencias
npm install
```

### 4. Ejecución en Modo Desarrollo
En dos terminales separadas:

**Terminal 1 (Backend con recarga en vivo):**
```bash
cd backend
npm run dev
```

**Terminal 2 (Frontend con Vite HMR):**
```bash
cd frontend
npm run dev
```
Accede a la interfaz de desarrollo en: `http://localhost:5173`

### 5. Compilación y ejecución local

```bash
# 1. Compilar el cliente React + Tailwind
cd frontend
npm run build

# 2. Compilar el servidor TypeScript
cd ../backend
npm run build

# 3. Iniciar el servidor unificado local
npm start
```
El servidor servirá la API y los activos estáticos en: **`http://127.0.0.1:8017`**

---

## ⚙️ Variables de Entorno

Configura el archivo `backend/.env` con los siguientes parámetros:

| Variable | Tipo | Descripción | Ejemplo |
| :--- | :--- | :--- | :--- |
| `FOUNDRY_API_KEY` | String | Clave de acceso a Microsoft Foundry / Azure AI | *Credencial secreta (fuera de Git)* |
| `FOUNDRY_ENDPOINT` | String | URL completa del endpoint de FLUX.2-pro | `https://tu-recurso.cognitiveservices.azure.com/providers/blackforestlabs/v1/flux-2-pro?api-version=preview` |
| `PORT` | Integer | Puerto de escucha del servidor Express | `8017` |
| `APP_ORIGIN` | String | Origen base permitido para solicitudes de mutación | `http://127.0.0.1:8017` |
| `DEV_ORIGIN` | String | Origen adicional permitido en desarrollo | `http://localhost:5173` |
| `COOKIE_SECURE` | Boolean | Activar flag Secure en cookies (recomendado `true` en HTTPS) | `false` |
| `GENERATION_HOURLY_LIMIT` | Integer | Cuota máxima horaria de generaciones por usuario | `20` |
| `TELEMETRY_FILE` | String | Ruta del archivo de eventos JSONL | `./data/security-events.jsonl` |
| `TYPESAFE_API_KEY` | String | Activa la evaluación opcional de Jev en modo observación | *Credencial secreta (fuera de Git)* |
| `SPLUNK_HEC_URL` | URL | Destino HEC para `npm run siem:export`; HTTP solo en loopback | `http://127.0.0.1:8088/services/collector/event` |
| `SPLUNK_HEC_TOKEN` | String | Token de ingesta HEC | *Credencial secreta (fuera de Git)* |

En `NODE_ENV=production`, el backend valida al arrancar que `APP_ORIGIN` sea un origen HTTPS y que `COOKIE_SECURE=true`. `backend/.env` se carga antes de crear los middlewares y las sesiones.

---

## 🔌 Referencia de la API

### Endpoints del Sistema y Catálogo
- `GET /health` — Estado de salud, runtime, identificador `X-Request-ID` y verificación de Foundry.
- `GET /api/catalog` — Catálogo público de 24 obras maestras en 4K UHD.

### Autenticación y Cuentas
- `POST /api/register` — Registro de usuario con validación de contraseña robusta.
- `POST /api/login` — Autenticación con limitador por IP y por cuenta; expedición de sesión y token CSRF.
- `POST /api/logout` — Revocación de sesión activa y eliminación de cookie.
- `GET /api/me` — Consulta del perfil del usuario autenticado actual.

### Bóveda de Imágenes
- `GET /api/images` — Obtiene la colección privada de imágenes del usuario.
- `GET /api/images/:id/file` — Descarga binaria con aislamiento de seguridad estricto.
- `DELETE /api/images/:id` — Eliminación atómica en base de datos y disco físico.
- `POST /api/images/upload` — Carga de fotos con pre-autenticación `requireUploadAuth` y optimización Sharp.

### Generación por IA
- `POST /api/generate` — Orquestación hacia FLUX.2-pro con soporte para prompt, resolución, semillas, control de cuota horaria y composición multi-referencia (*Identity Pack*).

---

## 🧪 Suite de Pruebas Automatizadas

El proyecto incluye pruebas de integración en TypeScript (`backend/tests/server.test.ts`) ejecutables de forma nativa:

```bash
cd backend
npm test
```

### Cobertura Verificada:
```text
🧪 Starting TypeScript / Prisma backend test suite...
1. Testing /health...
   ✓ /health returned ok (X-Request-ID, CSP, Blocked Origin, Pre-auth upload)
2. Testing /api/catalog...
   ✓ /api/catalog returned 24 4K items (cache-control: no-store)
3. Testing registration and authentication...
   ✓ User A registered and session cookie issued
   ✓ Duplicate email rejected with 409
4. Testing /api/me...
   ✓ /api/me confirmed authenticated user
5. Testing /api/images/upload with Sharp...
   ✓ Image uploaded successfully
   ✓ User isolation enforced: User B cannot access User A image
   ✓ Image deleted successfully
6. Testing Identity Pack synthesis with Sharp...
   ✓ Identity pack built successfully (808x542)

🎉 ALL TEST SUITES PASSED! Pure TypeScript + Prisma stack is 100% operational!
```

---

## 🔒 Avisos de Seguridad

> [!CAUTION]
> **Rotación de Credenciales Requerida:** Una clave API de Microsoft Foundry utilizada en fases iniciales apareció en archivos de ejemplo. Debe rotarse aunque el proyecto permanezca local; nunca comitees archivos `.env` a repositorios públicos o compartidos.

---

## 📄 Licencia

Este proyecto está bajo la Licencia **MIT**. Consulta el archivo `LICENSE` para mayores detalles.
