import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline';
import { backendDir } from './config.js';


export interface ExportOptions {
  inputPath: string;
  cursorPath: string;
  endpoint: string;
  token: string;
  sourcetype: string;
  maxEvents?: number;
  fetcher?: typeof fetch;
}

export async function exportFileToSplunk(options: ExportOptions): Promise<number> {
  const url = new URL(options.endpoint);
  if (url.protocol !== 'https:' || !['/services/collector', '/services/collector/event'].includes(url.pathname)) {
    throw new Error('SPLUNK_HEC_URL debe ser HTTPS y terminar en /services/collector o /services/collector/event');
  }
  if (!options.token.trim()) throw new Error('Falta SPLUNK_HEC_TOKEN');
  if (!fs.existsSync(options.inputPath)) return 0;

  const cursor = fs.existsSync(options.cursorPath) ? Number(fs.readFileSync(options.cursorPath, 'utf8')) : 0;
  if (!Number.isSafeInteger(cursor) || cursor < 0) throw new Error('Cursor inválido');
  const maxEvents = options.maxEvents ?? 100;
  if (!Number.isInteger(maxEvents) || maxEvents < 1 || maxEvents > 1000) throw new Error('Límite inválido');

  const stream = fs.createReadStream(options.inputPath, { encoding: 'utf8' });
  const lines = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let lineNumber = 0;
  let sent = 0;
  try {
    for await (const line of lines) {
      lineNumber++;
      if (lineNumber <= cursor || !line.trim()) continue;
      const event = JSON.parse(line) as { timestamp?: string; source?: string };
      const time = Date.parse(event.timestamp || '');
      const body = {
        time: Number.isFinite(time) ? time / 1000 : undefined,
        source: event.source || 'flux-backend',
        sourcetype: options.sourcetype,
        event,
      };
      const response = await (options.fetcher || fetch)(url, {
        method: 'POST',
        headers: { Authorization: `Splunk ${options.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error(`Splunk HEC respondió HTTP ${response.status}`);
      const acknowledgement = await response.json() as { code?: unknown };
      if (acknowledgement.code !== 0) throw new Error('Splunk HEC rechazó el evento');
      fs.mkdirSync(path.dirname(options.cursorPath), { recursive: true });
      const temporary = `${options.cursorPath}.tmp`;
      fs.writeFileSync(temporary, String(lineNumber), { mode: 0o600 });
      fs.renameSync(temporary, options.cursorPath);
      sent++;
      if (sent >= maxEvents) break;
    }
  } finally {
    lines.close();
    stream.destroy();
  }
  return sent;
}

const direct = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (direct) {
  const endpoint = process.env.SPLUNK_HEC_URL || '';
  const token = process.env.SPLUNK_HEC_TOKEN || '';
  const dataDir = path.join(backendDir, 'data');
  const sources = [
    { inputPath: process.env.TELEMETRY_FILE || path.join(dataDir, 'security-events.jsonl'), cursorPath: path.join(dataDir, 'splunk-security.cursor'), sourcetype: 'flux:security' },
    { inputPath: process.env.JEV_DECISIONS_FILE || path.join(dataDir, 'jev-decisions.jsonl'), cursorPath: path.join(dataDir, 'splunk-jev.cursor'), sourcetype: 'flux:jev' },
  ];
  Promise.all(sources.map((source) => exportFileToSplunk({ ...source, endpoint, token })))
    .then((counts) => console.log(`Eventos aceptados por Splunk HEC: ${counts.reduce((a, b) => a + b, 0)}`))
    .catch((error) => { console.error(error instanceof Error ? error.message : 'Error de exportación'); process.exitCode = 1; });
}
