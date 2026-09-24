import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rootDir = path.resolve(backendDir, '..');

// Explicit process environment wins; backend/.env takes precedence over root/.env.
dotenv.config({ path: path.join(backendDir, '.env') });
dotenv.config({ path: path.join(rootDir, '.env') });

export { backendDir, rootDir };

export function validateProductionConfig(env: NodeJS.ProcessEnv = process.env): void {
  if (env.NODE_ENV !== 'production') return;
  if (!env.APP_ORIGIN) throw new Error('APP_ORIGIN es obligatorio en producción');
  let origin: URL;
  try {
    origin = new URL(env.APP_ORIGIN);
  } catch {
    throw new Error('APP_ORIGIN debe ser una URL HTTPS válida');
  }
  if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) {
    throw new Error('APP_ORIGIN debe ser un origen HTTPS sin ruta ni credenciales');
  }
  if (env.COOKIE_SECURE !== 'true') throw new Error('COOKIE_SECURE=true es obligatorio en producción');
}
