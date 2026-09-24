import fs from 'node:fs';
import path from 'node:path';
import { backendDir } from './config.js';
import type { SecurityEvent } from './telemetry.js';

const ENDPOINT = 'https://api.typesafe.ai/v1/systemone';
const decisionPath = process.env.JEV_DECISIONS_FILE || path.join(backendDir, 'data/jev-decisions.jsonl');
const WINDOW_MS = 10 * 60_000;
const COOLDOWN_MS = 60_000;
const MAX_KEYS = 10_000;
const windows = new Map<string, { starts: number; failures: number; lastEvaluation: number }>();

export interface JevDecision {
  timestamp: string;
  source: 'jev';
  request_id: string;
  model: string;
  risk_score: number;
  confidence: number;
  recommendation: 'observe' | 'review';
  policy_version: 'jev-observe-v1';
  evidence: { event_type: string; status: number; failures_10m: number };
}

function validUnit(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

export async function evaluateWithJev(
  event: SecurityEvent,
  failures10m: number,
  apiKey: string,
  fetcher: typeof fetch = fetch,
): Promise<JevDecision> {
  const state = {
    application: 'flux-image-studio',
    event_type: event.event_type,
    method: event.method,
    path: event.path,
    http_status: event.status,
    failures_last_10_minutes: failures10m,
    security_tags: event.security_tags,
  };
  const response = await fetcher(ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'jev-latest',
      state,
      questions: {
        abuse_severity: {
          type: 'score',
          instructions: 'Rate the evidence of application abuse in this security event and its recent failure count. Assess the observed facts only.',
          criteria: [
            'Routine or harmless failure',
            'Suspicious activity that merits monitoring',
            'Likely abuse that merits analyst review',
            'Urgent abuse pattern that merits immediate analyst review',
          ],
        },
      },
    }),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`Jev HTTP ${response.status}`);
  const body: unknown = await response.json();
  if (!body || typeof body !== 'object') throw new Error('Invalid Jev response');
  const result = body as { model?: unknown; answers?: { abuse_severity?: { type?: unknown; score?: unknown; confidence?: unknown } } };
  const answer = result.answers?.abuse_severity;
  if (typeof result.model !== 'string' || !answer || answer.type !== 'score' ||
      typeof answer.score !== 'number' || !Number.isFinite(answer.score) || answer.score < 0 || answer.score > 3 ||
      !validUnit(answer.confidence)) throw new Error('Invalid Jev answer');

  return {
    timestamp: new Date().toISOString(),
    source: 'jev',
    request_id: event.request_id,
    model: result.model,
    risk_score: answer.score,
    confidence: answer.confidence,
    recommendation: answer.score >= 2 && answer.confidence >= 0.8 ? 'review' : 'observe',
    policy_version: 'jev-observe-v1',
    evidence: { event_type: event.event_type, status: event.status, failures_10m: failures10m },
  };
}

function relevant(event: SecurityEvent): boolean {
  return event.event_type === 'auth.login_failed' || event.event_type === 'auth.register_rejected' ||
    event.event_type === 'image.generation_failed' || event.status === 403 || event.status === 429;
}

export function maybeEvaluateSecurityEvent(event: SecurityEvent): void {
  const apiKey = process.env.TYPESAFE_API_KEY;
  if (!apiKey || !relevant(event)) return;

  const now = Date.now();
  if (windows.size > MAX_KEYS) {
    for (const [key, value] of windows) if (now - value.starts > WINDOW_MS) windows.delete(key);
    if (windows.size > MAX_KEYS) windows.delete(windows.keys().next().value!);
  }
  const key = event.src_ip || 'unknown';
  let window = windows.get(key);
  if (!window || now - window.starts > WINDOW_MS) {
    window = { starts: now, failures: 0, lastEvaluation: 0 };
    windows.set(key, window);
  }
  window.failures++;
  if (window.failures < 3 || now - window.lastEvaluation < COOLDOWN_MS) return;
  window.lastEvaluation = now;
  const failures = window.failures;

  void evaluateWithJev(event, failures, apiKey).then((decision) => {
    fs.mkdirSync(path.dirname(decisionPath), { recursive: true });
    fs.appendFileSync(decisionPath, JSON.stringify(decision) + '\n', { encoding: 'utf8', mode: 0o600 });
  }).catch(() => {
    // Jev is advisory. Provider failure never affects the user's request.
  });
}
