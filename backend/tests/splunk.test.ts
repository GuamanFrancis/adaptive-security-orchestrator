import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { exportFileToSplunk } from '../src/splunkExport.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'flux-splunk-'));
const inputPath = path.join(dir, 'events.jsonl');
const cursorPath = path.join(dir, 'cursor');
const events = [
  { timestamp: '2026-09-24T00:00:00.000Z', source: 'flux-backend', event_type: 'auth.login_failed' },
  { timestamp: '2026-09-24T00:01:00.000Z', source: 'flux-backend', event_type: 'auth.login_success' },
];
fs.writeFileSync(inputPath, events.map((event) => JSON.stringify(event)).join('\n') + '\n');

let calls = 0;
let failSecond = true;
const fetcher = (async (_url: string | URL | Request, init?: RequestInit) => {
  calls++;
  assert.equal((init?.headers as Record<string, string>).Authorization, 'Splunk test-token');
  const payload = JSON.parse(String(init?.body));
  assert.equal(payload.sourcetype, 'flux:security');
  assert.ok(payload.event.event_type);
  if (calls === 2 && failSecond) return new Response(JSON.stringify({ code: 5 }), { status: 200 });
  return new Response(JSON.stringify({ code: 0 }), { status: 200 });
}) as typeof fetch;
const options = { inputPath, cursorPath, endpoint: 'https://splunk.example.com/services/collector/event', token: 'test-token', sourcetype: 'flux:security', fetcher };

try {
  await assert.rejects(() => exportFileToSplunk(options));
  assert.equal(fs.readFileSync(cursorPath, 'utf8'), '1');
  failSecond = false;
  assert.equal(await exportFileToSplunk(options), 1);
  assert.equal(fs.readFileSync(cursorPath, 'utf8'), '2');
  assert.equal(await exportFileToSplunk(options), 0);
  await assert.rejects(() => exportFileToSplunk({ ...options, endpoint: 'http://splunk.example.com/services/collector/event' }));
  console.log('Splunk HEC export, acknowledgement and retry cursor passed');
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
