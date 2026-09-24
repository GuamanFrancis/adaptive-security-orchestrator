# Adaptive Security Orchestrator & AI Creative Studio

<p align="center">
  <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80" alt="Adaptive Security Orchestrator Banner" width="100%" style="border-radius: 12px; max-height: 380px; object-fit: cover;" />
</p>

<p align="center">
  <strong>AI image studio powered by FLUX.2-pro (Microsoft Foundry), with private image storage, security controls, and a Canvas editor.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-5.4-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/TailwindCSS-3.4-38BDF8?logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Node.js-22.x-339933?logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/Sharp-High--Speed%20Imaging-990000" alt="Sharp" />
  <img src="https://img.shields.io/badge/FLUX.2--pro-Microsoft%20Foundry-7928CA" alt="FLUX.2-pro" />
  <img src="https://img.shields.io/badge/Security-Foundation%20in%20progress-10B981" alt="Security" />
</p>

---

## 📑 Tabla de Contenidos
- [Descripción General](#-descripción-general)
- [Arquitectura del Sistema](#-arquitectura-del-sistema)
- [Pilares de Seguridad Adaptativa](#-pilares-de-seguridad-adaptativa)
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
- [Licencia](#-licencia)

---

## 🌟 Descripción General

**Adaptive Security Orchestrator** integra **FLUX.2-pro** mediante **Microsoft Foundry / Azure AI** para generar y editar imágenes. La seguridad está en desarrollo por fases: el estado real y los componentes pendientes se describen en [docs/SECURITY_ARCHITECTURE.md](docs/SECURITY_ARCHITECTURE.md).

Construido íntegramente sobre un stack unificado en **TypeScript** (sin entornos híbridos de Python en ejecución), garantiza mantenibilidad, tipado estricto extremo a extremo y alto rendimiento tanto en el cliente como en el servidor.

---

## 📐 Arquitectura del Sistema

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React 18 + Vite)                      │
│   Tailwind CSS  │  Director Creativo  │  Editor Pro  │  Catálogo 4K    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / JSON / Multipart
                                    │ Cookies HttpOnly + Header CSRF
┌───────────────────────────────────▼────────────────────────────────────┐
│                    ADAPTIVE SECURITY ORCHESTRATOR                      │
│                                                                        │
│  [ Origin Validator ] ──► [ Rate Limiter ] ──► [ Session & CSRF Guard ]│
│                                                        │               │
│                                                        ▼               │
│  ┌─────────────────────────┐              ┌─────────────────────────┐  │
│  │   Prisma ORM (SQLite)   │              │   Sharp Image Pipeline  │  │
│  │  - User Authentication  │              │  - EXIF Auto-Transpose  │  │
│  │  - Session Lifecycle    │              │  - Identity Pack 2x3/3x2│  │
│  │  - Multi-tenant Images  │              │  - High-res Sanitizer   │  │
│  └─────────────────────────┘              └────────────┬────────────┘  │
└────────────────────────────────────────────────────────┼───────────────┘
                                                         │ HTTPS Dual-Auth
                                                         │ (Bearer + api-key)
                                                         ▼
                                            ┌─────────────────────────┐
                                            │    Microsoft Foundry    │
                                            │      (FLUX.2-pro)       │
                                            └─────────────────────────┘
```

---

## 🛡️ Pilares de Seguridad Adaptativa

El backend implementa los siguientes controles locales. Para exponer el servicio a Internet se requieren además los controles de infraestructura descritos en [docs/SECURITY_ARCHITECTURE.md](docs/SECURITY_ARCHITECTURE.md):

1. **Gestión Criptográfica de Identidad**: Hashing de contraseñas mediante `scrypt` derivado en 64 bytes (`N=16384, r=8, p=1`) con sal aleatoria de 16 bytes y comparación de digestos en tiempo constante (`timingSafeEqual`) contra ataques de temporización.
2. **Ciclo de Vida de Sesión HttpOnly**: Identificadores de sesión opacos de 192 bits codificados en `base64url` almacenados exclusivamente en cookies con directivas `HttpOnly`, `SameSite=Lax` y control estricto de expiración.
3. **Defensa Mitigante contra CSRF**: Token único de 128 bits emitido por sesión, requerido en la cabecera `X-CSRF-Token` para todas las operaciones mutantes (`POST`, `PUT`, `DELETE`).
4. **Validación Adaptativa de Origen**: Middleware de filtrado que verifica la procedencia de cada solicitud y rechaza conexiones externas o de dominios no autorizados (protección anti-tampering).
5. **Aislamiento Multi-inquilino de Archivos**: Los recursos de imagen y descargas binarias están vinculados de manera estricta al identificador del usuario propietario en la base de datos; accesos cruzados resultan en denegación inmediata (`404 Not Found`).
6. **Saneamiento EXIF y Prevención de Desbordamiento**: Procesamiento a través de **Sharp** que reorienta automáticamente las capturas móviles, elimina metadatos residuales vulnerables e impone límites estrictos de memoria y resolución (máximo 32 MP / 20 MB).
7. **Content Security Policy (CSP)**: Cabeceras restrictivas para mitigar ataques XSS e inyecciones de script, permitiendo únicamente orígenes validados y dominios autorizados de Unsplash.

---

## 🚀 Módulos Principales

### 1. Creative AI Studio & FLUX.2-pro
- **Modos de Generación**:
  - `t2i` (Texto a Imagen): Control total sobre el aspect ratio (1:1, 4:5, 9:16, 16:9, etc.) y seed de aleatoriedad.
  - `copy_pose_outfit` (I2I Guía): Transferencia de composición espacial y vestimenta mediante imagen guía.
  - `identity_pack`: Fusión inteligente de 1 a 6 imágenes del sujeto en cuadrículas balanceadas (2×3 o 3×2) compuestas en memoria por **Sharp** para máxima preservación de rasgos faciales.
- **Asistente de Dirección**: Inyección automatizada de estilos fotográficos (Cine Anamórfico 35mm, Hasselblad Medio Formato, Iluminación Golden Hour, Shinjuku Neon, etc.).

### 2. Editor Pro (Lienzo HTML5 Canvas 2D)
Suite completa de retoque y post-procesado accesible directamente en `/app/editor`:
- **Parámetros en Tiempo Real**: Brillo, Contraste, Saturación, Calidez, Exposición, Desenfoque gaussiano suave, Viñeta cinematográfica, Grano fílmico e Inversión de luminancia.
- **8 Presets LUT**: *Natural*, *Teal & Orange*, *Monocromo Noir*, *Golden Hour*, *Cyberpunk Neo*, *Vintage 70s*, *Mate Falso* y *Nieve Ártica*.
- **Transformaciones Geométricas**: Rotación 90° horario/antihorario, volteo horizontal y vertical.
- **Canalización Directa**: Guarda la imagen retocada en la biblioteca privada, descárgala en PNG nativo o envíala directamente como Referencia 1 o Guía para nuevas generaciones.
- **Drag & Drop**: Soporte para arrastrar archivos locales directamente sobre el viewport.

### 3. Catálogo Maestro 4K UHD
Galería pública de inspiración curada con **24 obras maestras** en ultra alta resolución (3840 px) categorizadas en Retrato, Arquitectura, Cinematografía, Naturaleza, Arte Digital y Lifestyle. Cada obra cuenta con su ficha técnica fotográfica detallada y botones de transferencia instantánea al estudio o al editor.

### 4. Bóveda Privada de Medios
Panel de control personal donde el usuario visualiza, organiza, descarga y elimina sus creaciones o fotos externas cargadas, respaldado por **Prisma ORM** sobre SQLite con soporte transparente para PostgreSQL.

---

## 📁 Estructura del Proyecto

El repositorio está organizado en dos módulos independientes y autosuficientes:

```text
adaptive-security-orchestrator/
│
├── backend/                       # Servidor Node.js + TypeScript + Prisma
│   ├── data/
│   │   ├── outputs/               # Almacenamiento seguro de archivos de imagen
│   │   └── studio.sqlite3         # Base de datos local SQLite
│   ├── prisma/
│   │   └── schema.prisma          # Esquema de datos y modelos relacionales
│   ├── src/
│   │   ├── auth.ts                # Servicios de seguridad, criptografía y sesiones
│   │   ├── catalog.ts             # Colección curada de 24 obras 4K
│   │   ├── db.ts                  # Cliente singleton de Prisma
│   │   ├── flux.ts                # Conector a Microsoft Foundry FLUX.2-pro
│   │   ├── imageUtils.ts          # Procesador gráfico Sharp (EXIF, Identity Pack)
│   │   └── index.ts               # Servidor Express, middlewares y rutas REST/SPA
│   ├── tests/
│   │   └── server.test.ts         # Suite automatizada de pruebas en TypeScript
│   ├── .env                       # Variables de entorno y credenciales
│   ├── .env.example               # Plantilla de configuración
│   ├── package.json               # Dependencias del servidor
│   └── tsconfig.json              # Configuración TypeScript del backend
│
├── frontend/                      # Cliente web React + TypeScript + Tailwind
│   ├── src/
│   │   ├── App.tsx                # Vistas principales (Studio, Editor, Galería, Vault)
│   │   ├── api.ts                 # Cliente HTTP tipado con interceptores
│   │   ├── image.ts               # Utilidades de imagen en el cliente
│   │   ├── router.tsx             # Enrutador cliente SPA reactivo
│   │   └── style.css              # Sistema de diseño con variables y Tailwind
│   ├── postcss.config.js          # Pipeline PostCSS
│   ├── tailwind.config.js         # Configuración del motor Tailwind CSS
│   ├── vite.config.ts             # Empaquetador Vite con proxy inverso
│   ├── package.json               # Dependencias del cliente
│   └── tsconfig.json              # Configuración TypeScript del frontend
│
├── .gitignore                     # Exclusión de artefactos y entornos
└── README.md                      # Documentación principal del sistema
```

---

## 📋 Requisitos Previos

- **Node.js**: Versión `20.x` o `22.x` LTS instalada.
- **npm**: Versión `10.x` o superior.
- **Credenciales Azure**: Endpoint y API Key válidos de Microsoft Foundry para el modelo `FLUX.2-pro`.

---

## 🛠️ Guía de Instalación y Puesta en Marcha

### 1. Clonar el repositorio
```bash
git clone https://github.com/tu-usuario/adaptive-security-orchestrator.git
cd adaptive-security-orchestrator
```

### 2. Configurar el Backend
```bash
cd backend

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Edita backend/.env con tus credenciales de Microsoft Foundry

# Generar cliente de Prisma y verificar esquema
npx prisma generate
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
Accede a la interfaz en: `http://localhost:5173`

### 5. Compilación y Despliegue para Producción

```bash
# 1. Compilar el cliente React + Tailwind
cd frontend
npm run build

# 2. Compilar el servidor TypeScript
cd ../backend
npm run build

# 3. Iniciar el servidor unificado de producción
npm start
```
El servidor servirá tanto la API como la interfaz compilada en: **`http://127.0.0.1:8017`**

---

## ⚙️ Variables de Entorno

Configura el archivo `backend/.env` con los siguientes parámetros:

| Variable | Tipo | Descripción | Ejemplo |
| :--- | :--- | :--- | :--- |
| `FOUNDRY_API_KEY` | String | Clave de acceso a Microsoft Foundry / Azure AI | valor secreto, fuera de Git |
| `FOUNDRY_ENDPOINT` | String | URL completa del endpoint de FLUX.2-pro | `https://tu-recurso.cognitiveservices.azure.com/providers/blackforestlabs/v1/flux-2-pro?api-version=preview` |
| `PORT` | Integer | Puerto de escucha del servidor Express | `8017` |
| `APP_ORIGIN` | String | Origen base permitido para solicitudes de mutación | `http://127.0.0.1:8017` |
| `COOKIE_SECURE` | Boolean | Activar flag Secure en cookies (recomendado `true` en HTTPS) | `false` |

---

## 🔌 Referencia de la API

### Endpoints del Sistema y Catálogo
- `GET /health` — Estado de salud, runtime y verificación de conectividad con Foundry.
- `GET /api/catalog` — Listado completo de las 24 creaciones en resolución 4K.

### Autenticación y Cuentas
- `POST /api/register` — Registro de cuenta con validación de contraseña robusta.
- `POST /api/login` — Autenticación, expedición de cookie `session_id` y token CSRF.
- `POST /api/logout` — Revocación de sesión activa y limpieza de cookies.
- `GET /api/me` — Consulta del perfil del usuario autenticado actual.

### Bóveda de Imágenes
- `GET /api/images` — Obtiene la colección privada de imágenes del usuario.
- `GET /api/images/:id/file` — Descarga binaria con aislamiento de seguridad.
- `DELETE /api/images/:id` — Eliminación atómica en base de datos y disco físico.
- `POST /api/images/upload` — Carga directa de imágenes externas/editadas con optimización Sharp.

### Generación por IA
- `POST /api/generate` — Orquestación de peticiones hacia FLUX.2-pro con soporte para prompt, resolución, semillas, tolerancia de seguridad y composición multi-referencia (*Identity Pack*).

---

## 🧪 Suite de Pruebas Automatizadas

El proyecto incluye pruebas de integración en TypeScript (`backend/tests/server.test.ts`) ejecutables de forma nativa sin herramientas externas de Python:

```bash
cd backend
npm test
```

### Cobertura de Pruebas:
```text
🧪 Starting TypeScript / Prisma backend test suite...
1. Testing /health...
   ✓ /health returned ok
2. Testing /api/catalog...
   ✓ /api/catalog returned 24 4K items
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

🎉 ALL 7 TEST SUITES PASSED! Pure TypeScript + Prisma stack is 100% operational!
```

---

## 📄 Licencia

Este proyecto está bajo la Licencia **MIT**. Consulta el archivo `LICENSE` para mayores detalles.
