import assert from 'node:assert/strict';
import { evaluateWithJev, classifyJevError } from '../src/jev.js';
import type { SecurityEvent } from '../src/telemetry.js';

const event: SecurityEvent = {
  timestamp: '2026-09-24T00:00:00.000Z', source: 'flux-backend',
  event_type: 'auth.login_failed', request_id: 'test-request', src_ip: '192.0.2.1',
  user: null, path: '/api/login', method: 'POST', status: 401,
  user_agent: 'test-agent', security_tags: ['authentication'],
};

let requestBody: any;
const fakeFetch = (async (url: string | URL | Request, init?: RequestInit) => {
  assert.equal(String(url), 'https://api.typesafe.ai/v1/systemone');
  assert.equal(init?.method, 'POST');
  assert.equal((init?.headers as Record<string, string>).Authorization, 'Bearer test-key');
  requestBody = JSON.parse(String(init?.body));
  return new Response(JSON.stringify({
    model: 'jev-1.13.0',
    answers: { abuse_severity: { type: 'score', score: 2.5, confidence: 0.91 } },
  }), { status: 200 });
}) as typeof fetch;

const decision = await evaluateWithJev(event, 4, 'test-key', fakeFetch);
assert.equal(requestBody.model, 'jev-latest');
assert.equal(requestBody.questions.abuse_severity.type, 'score');
assert.equal(requestBody.state.failures_last_10_minutes, 4);
assert.ok(!JSON.stringify(requestBody).includes('192.0.2.1'));
assert.ok(!JSON.stringify(requestBody).includes('test-agent'));
assert.equal(decision.recommendation, 'review');
assert.equal(decision.request_id, event.request_id);
assert.equal(classifyJevError(new Error('Jev HTTP 429')), 'rate_limit');
assert.equal(classifyJevError(new Error('Jev HTTP 401')), 'authentication');
assert.equal(classifyJevError(new Error('Invalid Jev answer')), 'invalid_response');

await assert.rejects(() => evaluateWithJev(event, 4, 'test-key', (async () =>
  new Response(JSON.stringify({ model: 'jev-1.13.0', answers: { abuse_severity: { type: 'score', score: 99, confidence: 1 } } }), { status: 200 })) as typeof fetch));

console.log('Jev contract and response validation passed');
