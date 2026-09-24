import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Request, Response, NextFunction } from 'express';

export interface SecurityEvent {
  timestamp: string;
  source: 'flux-backend';
  event_type: string;
  request_id: string;
  src_ip: string | null;
  user: string | null;
  path: string;
  method: string;
  status: number;
  user_agent: string | null;
  security_tags: string[];
}

const telemetryPath = process.env.TELEMETRY_FILE || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data/security-events.jsonl');

function eventType(req: Request, status: number): string {
  if (req.path === '/api/login') return status === 200 ? 'auth.login_success' : 'auth.login_failed';
  if (req.path === '/api/register') return status === 201 ? 'auth.register_success' : 'auth.register_rejected';
  if (req.path === '/api/generate') return status >= 200 && status < 300 ? 'image.generation_success' : 'image.generation_failed';
  if (status === 404) return 'http.not_found';
  if (status === 429) return 'http.rate_limited';
  if (status >= 500) return 'http.server_error';
  return 'http.request';
}

function tags(req: Request, status: number): string[] {
  const result: string[] = [];
  if (req.path.startsWith('/api/login') || req.path.startsWith('/api/register')) result.push('authentication');
  if (status === 401 || status === 403) result.push('access_denied');
  if (status === 429) result.push('rate_limited');
  if (status >= 500) result.push('service_error');
  return result;
}

export function telemetryMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = crypto.randomUUID();
  res.setHeader('X-Request-ID', requestId);
  res.on('finish', () => {
    if (req.path.startsWith('/assets/')) return;
    const event: SecurityEvent = {
      timestamp: new Date().toISOString(),
      source: 'flux-backend',
      event_type: eventType(req, res.statusCode),
      request_id: requestId,
      src_ip: req.ip || req.socket.remoteAddress || null,
      user: null,
      path: req.path.slice(0, 512),
      method: req.method,
      status: res.statusCode,
      user_agent: String(req.headers['user-agent'] || '').replace(/[\r\n]/g, ' ').slice(0, 256) || null,
      security_tags: tags(req, res.statusCode),
    };
    try {
      fs.mkdirSync(path.dirname(telemetryPath), { recursive: true });
      fs.appendFileSync(telemetryPath, JSON.stringify(event) + '\n', { encoding: 'utf8', mode: 0o600 });
    } catch {
      // Telemetry failure must not change the HTTP response already sent.
    }
  });
  next();
}
