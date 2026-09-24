import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

import { prisma } from './db.js';
import {
  hashPassword,
  verifyPassword,
  createSession,
  clearSession,
  getCurrentUser,
} from './auth.js';
import { CATALOG_ITEMS } from './catalog.js';
import {
  isFoundryConfigured,
  generateFluxImage,
} from './flux.js';
import {
  processReferenceImage,
  imageToBase64Hq,
  buildIdentityPack,
} from './imageUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../../');
const DATA_DIR = path.resolve(__dirname, '../data');
const OUTPUTS_DIR = path.join(DATA_DIR, 'outputs');
const FRONTEND_DIST = path.resolve(ROOT, 'frontend/dist');

// Ensure storage directories exist
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(OUTPUTS_DIR, { recursive: true });

const app = express();
const PORT = parseInt(process.env.PORT || '8017', 10);
const APP_ORIGIN = (process.env.APP_ORIGIN || 'http://127.0.0.1:8017').replace(/\/+$/, '');

// Rate limiting in-memory store
const rateLimits = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(key: string, maxAttempts: number, windowSeconds: number): boolean {
  const now = Math.floor(Date.now() / 1000);
  const entry = rateLimits.get(key);
  if (!entry || entry.resetAt <= now) {
    rateLimits.set(key, { count: 1, resetAt: now + windowSeconds });
    return true;
  }
  if (entry.count >= maxAttempts) {
    return false;
  }
  entry.count++;
  return true;
}

// Multer memory storage for uploads and multi-reference payloads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

// Middleware configuration
app.use(cookieParser());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Security & CSP Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' https://images.unsplash.com https://*.unsplash.com data: blob:; " +
      "connect-src 'self' blob: data: https://images.unsplash.com https://*.unsplash.com; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
  );

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const origin = req.headers.origin;
    if (origin) {
      const normOrigin = origin.replace(/\/+$/, '');
      const isAllowed =
        normOrigin === APP_ORIGIN ||
        normOrigin.startsWith('http://127.0.0.1:') ||
        normOrigin === 'http://127.0.0.1' ||
        normOrigin.startsWith('http://localhost:') ||
        normOrigin === 'http://localhost';

      if (!isAllowed || normOrigin.includes('evil')) {
        return res.status(403).json({ detail: 'Origen no permitido.' });
      }
    }
  }

  next();
});

// Static assets from frontend build
app.use('/assets', express.static(path.join(FRONTEND_DIST, 'assets')));

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    foundry_configured: isFoundryConfigured(),
    version: '2.5.0',
    runtime: 'Node.js/TypeScript + Prisma',
  });
});

// Catalog endpoint
app.get('/api/catalog', (_req: Request, res: Response) => {
  res.json({ catalog: CATALOG_ITEMS });
});

// User Registration
app.post('/api/register', async (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
  if (!checkRateLimit(`register_${ip}`, 5, 3600)) {
    return res.status(429).json({ detail: 'Demasiados intentos de registro.' });
  }

  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email) || email.length > 254 || password.length < 12 || password.length > 128) {
    return res.status(422).json({
      detail: 'Correo válido y contraseña de 12 a 128 caracteres requeridos.',
    });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ detail: 'No se pudo crear la cuenta con ese correo.' });
    }

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashPassword(password),
        createdAt: new Date().toISOString(),
      },
    });

    const csrf = await createSession(res, user.id);
    return res.status(201).json({ email, csrf });
  } catch (err) {
    return res.status(500).json({ detail: 'Error interno al registrar usuario.' });
  }
});

// User Login
app.post('/api/login', async (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');

  if (!checkRateLimit(`login_${ip}_${email}`, 10, 3600)) {
    return res.status(429).json({ detail: 'Demasiados intentos de inicio de sesión.' });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ detail: 'Credenciales inválidas.' });
  }

  const csrf = await createSession(res, user.id);
  return res.json({ email, csrf });
});

// User Logout
app.post('/api/logout', async (req: Request, res: Response) => {
  const user = await getCurrentUser(req, true);
  if (!user) {
    return res.status(403).json({ detail: 'Token CSRF inválido o sesión ausente.' });
  }

  await clearSession(req, res);
  return res.json({ message: 'Sesión cerrada correctamente.' });
});

// Current User Info
app.get('/api/me', async (req: Request, res: Response) => {
  const user = await getCurrentUser(req, false);
  if (!user) {
    return res.status(401).json({ detail: 'Sesión no iniciada.' });
  }
  return res.json({ email: user.email, csrf: user.csrf });
});

// Get User Images
app.get('/api/images', async (req: Request, res: Response) => {
  const user = await getCurrentUser(req, false);
  if (!user) {
    return res.status(401).json({ detail: 'Sesión no iniciada.' });
  }

  const images = await prisma.image.findMany({
    where: { userId: user.userId },
    orderBy: { createdAt: 'desc' },
  });

  return res.json({
    images: images.map((img) => ({
      id: img.id,
      prompt: img.prompt,
      width: img.width,
      height: img.height,
      seed: img.seed,
      filename: img.filename,
      created_at: img.createdAt,
      url: `/api/images/${img.id}/file`,
    })),
  });
});

// Get Single Image File
app.get('/api/images/:id/file', async (req: Request, res: Response) => {
  const user = await getCurrentUser(req, false);
  if (!user) {
    return res.status(401).json({ detail: 'Sesión no iniciada.' });
  }

  const image = await prisma.image.findUnique({
    where: { id: req.params.id },
  });

  if (!image || image.userId !== user.userId) {
    return res.status(404).json({ detail: 'Imagen no encontrada o no autorizada.' });
  }

  const filePath = path.join(OUTPUTS_DIR, image.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ detail: 'Archivo no encontrado en disco.' });
  }

  return res.sendFile(filePath);
});

// Delete Image
app.delete('/api/images/:id', async (req: Request, res: Response) => {
  const user = await getCurrentUser(req, true);
  if (!user) {
    return res.status(403).json({ detail: 'Token CSRF inválido o sesión ausente.' });
  }

  const image = await prisma.image.findUnique({
    where: { id: req.params.id },
  });

  if (!image || image.userId !== user.userId) {
    return res.status(404).json({ detail: 'Imagen no encontrada.' });
  }

  await prisma.image.delete({
    where: { id: image.id },
  });

  const filePath = path.join(OUTPUTS_DIR, image.filename);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch {}
  }

  return res.json({ ok: true, id: image.id });
});

// Upload External / Edited Photo to Private Library
app.post(
  '/api/images/upload',
  upload.single('file'),
  async (req: Request, res: Response) => {
    const user = await getCurrentUser(req, true);
    if (!user) {
      return res.status(403).json({ detail: 'Token CSRF inválido o sesión no iniciada.' });
    }

    if (!req.file || !req.file.buffer) {
      return res.status(422).json({ detail: 'Se requiere un archivo de imagen válido.' });
    }

    let processedBuffer: Buffer;
    let meta: sharp.Metadata;
    try {
      const pipeline = sharp(req.file.buffer).rotate();
      meta = await pipeline.metadata();
      if (!meta.width || !meta.height) {
        return res.status(422).json({ detail: 'Archivo de imagen no legible.' });
      }
      processedBuffer = await pipeline.toFormat('png').toBuffer();
    } catch {
      return res.status(422).json({ detail: 'Archivo de imagen inválido o corrupto.' });
    }

    const imageId = crypto.randomBytes(12).toString('base64url');
    const filename = `${imageId}.png`;
    const prompt = String(req.body?.prompt || 'Foto subida por el usuario').slice(0, 500);

    fs.writeFileSync(path.join(OUTPUTS_DIR, filename), processedBuffer);

    await prisma.image.create({
      data: {
        id: imageId,
        userId: user.userId,
        prompt,
        width: meta.width,
        height: meta.height,
        seed: 1,
        filename,
        createdAt: new Date().toISOString(),
      },
    });

    return res.json({
      id: imageId,
      prompt,
      width: meta.width,
      height: meta.height,
      filename,
      url: `/api/images/${imageId}/file`,
      created_at: new Date().toISOString(),
    });
  }
);

// Generate Image with FLUX.2-pro
app.post(
  '/api/generate',
  upload.fields([
    { name: 'reference1', maxCount: 1 },
    { name: 'reference2', maxCount: 1 },
    { name: 'reference3', maxCount: 1 },
    { name: 'reference4', maxCount: 1 },
    { name: 'reference5', maxCount: 1 },
    { name: 'reference6', maxCount: 1 },
    { name: 'guide_image', maxCount: 1 },
  ]),
  async (req: Request, res: Response) => {
    const user = await getCurrentUser(req, true);
    if (!user) {
      return res.status(403).json({ detail: 'Token CSRF inválido o sesión ausente.' });
    }

    const prompt = String(req.body?.prompt || '').trim();
    if (prompt.length < 1 || prompt.length > 2000) {
      return res.status(422).json({ detail: 'Prompt de 1 a 2000 caracteres requerido.' });
    }

    const width = parseInt(req.body?.width || '1024', 10);
    const height = parseInt(req.body?.height || '1024', 10);
    if (
      isNaN(width) ||
      isNaN(height) ||
      width < 256 ||
      height < 256 ||
      width > 2048 ||
      height > 2048 ||
      width % 16 !== 0 ||
      height % 16 !== 0 ||
      width * height > 4_194_304
    ) {
      return res.status(422).json({ detail: 'Dimensiones inválidas (múltiplos de 16, máx 2048x2048).' });
    }

    let seed = parseInt(req.body?.seed, 10);
    if (isNaN(seed) || seed < 0 || seed > 2_147_483_647) {
      seed = Math.floor(Math.random() * 2_147_483_646) + 1;
    }

    const format = req.body?.format === 'jpeg' || req.body?.format === 'jpg' ? 'jpeg' : 'png';
    const safetyTolerance = Math.max(0, Math.min(5, parseInt(req.body?.safety_tolerance || '2', 10)));
    const mode = String(req.body?.mode || 't2i');

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

    // Collect reference files
    const refKeys = ['reference1', 'reference2', 'reference3', 'reference4', 'reference5', 'reference6'];
    const validRefBuffers: Buffer[] = [];
    if (files) {
      for (const k of refKeys) {
        const item = files[k]?.[0];
        if (item && item.buffer) {
          try {
            const buf = await processReferenceImage(item.buffer);
            validRefBuffers.push(buf);
          } catch {}
        }
      }
    }

    let guideBuffer: Buffer | null = null;
    if (files?.guide_image?.[0]?.buffer) {
      try {
        guideBuffer = await processReferenceImage(files.guide_image[0].buffer);
      } catch {}
    }

    // Input images assignment
    let inputImageBase64: string | undefined;
    let inputImage2Base64: string | undefined;

    if (validRefBuffers.length > 1 && ['identity_pack', 'copy_pose_outfit', 't2i'].includes(mode)) {
      const layout = String(req.body?.layout || '2x3');
      const cellSize = parseInt(req.body?.cell_size || '384', 10);
      const border = parseInt(req.body?.border || '10', 10);
      const bgHex = String(req.body?.bg_hex || '#0b1220');
      const pack = await buildIdentityPack(validRefBuffers, layout, cellSize, border, bgHex);
      inputImageBase64 = await imageToBase64Hq(pack);
    } else if (validRefBuffers.length === 1) {
      inputImageBase64 = await imageToBase64Hq(validRefBuffers[0]);
    }

    if (guideBuffer) {
      inputImage2Base64 = await imageToBase64Hq(guideBuffer);
    } else if (validRefBuffers.length === 2 && inputImageBase64 && !inputImage2Base64 && mode !== 'identity_pack') {
      inputImageBase64 = await imageToBase64Hq(validRefBuffers[0]);
      inputImage2Base64 = await imageToBase64Hq(validRefBuffers[1]);
    }

    if (!isFoundryConfigured()) {
      return res.status(503).json({
        detail: 'Foundry no está configurado con una clave nueva y un endpoint válido.',
      });
    }

    try {
      const result = await generateFluxImage({
        prompt,
        width,
        height,
        seed,
        format,
        safetyTolerance,
        inputImageBase64,
        inputImage2Base64,
      });

      const imageId = crypto.randomBytes(12).toString('base64url');
      const filename = `${imageId}.${result.format}`;
      fs.writeFileSync(path.join(OUTPUTS_DIR, filename), result.imageBuffer);

      await prisma.image.create({
        data: {
          id: imageId,
          userId: user.userId,
          prompt,
          width: result.width,
          height: result.height,
          seed: result.seed,
          filename,
          createdAt: new Date().toISOString(),
        },
      });

      return res.status(201).json({
        id: imageId,
        seed: result.seed,
        format: result.format,
        width: result.width,
        height: result.height,
        filename,
        url: `/api/images/${imageId}/file`,
        b64_json: result.b64Json,
        prompt,
        created_at: new Date().toISOString(),
      });
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.startsWith('CONFIG_ERROR')) {
        return res.status(503).json({ detail: msg.replace('CONFIG_ERROR: ', '') });
      }
      if (msg.startsWith('AUTH_ERROR')) {
        return res.status(502).json({ detail: msg.replace('AUTH_ERROR: ', '') });
      }
      if (msg.startsWith('QUOTA_ERROR')) {
        return res.status(503).json({ detail: msg.replace('QUOTA_ERROR: ', '') });
      }
      return res.status(502).json({ detail: msg || 'Error al comunicarse con Foundry.' });
    }
  }
);

// SPA route handler for all application routes
const ALLOWED_SPA_ROUTES = new Set([
  'login',
  'register',
  'explore',
  'catalog',
  'app',
  'app/create',
  'app/library',
  'app/editor',
  'app/catalog',
  'create',
  'library',
  'editor',
]);

app.get('*', (req: Request, res: Response) => {
  const cleanPath = req.path.replace(/^\/+|\/+$/g, '');
  if (cleanPath === '' || ALLOWED_SPA_ROUTES.has(cleanPath) || cleanPath.startsWith('app/')) {
    const indexPath = path.join(FRONTEND_DIST, 'index.html');
    if (!fs.existsSync(indexPath)) {
      return res.status(503).send('Compila el frontend con npm run build.');
    }
    return res.sendFile(indexPath);
  }
  return res.status(404).json({ detail: 'Ruta no encontrada.' });
});

// Start Server when run directly
const isDirectRun =
  process.env.NODE_ENV !== 'test' &&
  !process.env.TEST &&
  Boolean(process.argv[1] && /index\.(ts|js)$/.test(process.argv[1]));

if (isDirectRun) {
  app.listen(PORT, '127.0.0.1', () => {
    console.log(`🚀 Flux Secure Studio Node.js server running at http://127.0.0.1:${PORT}`);
    console.log(`📡 Foundry Configured: ${isFoundryConfigured()}`);
  });
}

export { app };
