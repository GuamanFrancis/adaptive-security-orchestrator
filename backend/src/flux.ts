import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../../');

export function getFoundryCredentials(): { apiKey: string; endpoint: string } {
  dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });
  dotenv.config({ path: path.join(ROOT, '.env'), override: true });
  const apiKey = process.env.FOUNDRY_API_KEY || process.env.AZURE_API_KEY || '';
  const endpoint = process.env.FOUNDRY_ENDPOINT || process.env.AZURE_FLUX_ENDPOINT || '';
  return { apiKey, endpoint };
}

export function isFoundryConfigured(): boolean {
  const { apiKey, endpoint } = getFoundryCredentials();
  if (!apiKey || !endpoint) return false;
  try {
    const parsed = new URL(endpoint);
    if (parsed.protocol !== 'https:' || !parsed.hostname) return false;
    if (parsed.hostname.toLowerCase().includes('your-resource')) return false;
    const p = parsed.pathname.toLowerCase();
    return p.endsWith('/providers/blackforestlabs/v1/flux-2-pro') || p.includes('flux-2-pro');
  } catch {
    return false;
  }
}

export interface FluxGenerateOptions {
  prompt: string;
  width: number;
  height: number;
  seed: number;
  format: string;
  safetyTolerance: number;
  inputImageBase64?: string;
  inputImage2Base64?: string;
}

export interface FluxGenerateResult {
  imageBuffer: Buffer;
  b64Json: string;
  seed: number;
  width: number;
  height: number;
  format: string;
}

export async function generateFluxImage(options: FluxGenerateOptions): Promise<FluxGenerateResult> {
  const { apiKey, endpoint } = getFoundryCredentials();
  if (!isFoundryConfigured()) {
    throw new Error('CONFIG_ERROR: Foundry no está configurado con una clave nueva y un endpoint válido.');
  }

  const payload: Record<string, any> = {
    model: 'FLUX.2-pro',
    prompt: options.prompt.trim(),
    width: options.width,
    height: options.height,
    output_format: options.format === 'jpeg' ? 'jpeg' : 'png',
    seed: options.seed,
    safety_tolerance: options.safetyTolerance,
  };

  if (options.inputImageBase64) {
    payload.input_image = options.inputImageBase64;
  }
  if (options.inputImage2Base64) {
    payload.input_image_2 = options.inputImage2Base64;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(300_000),
  });

  if (!response.ok) {
    const status = response.status;
    if (status === 401 || status === 403) {
      throw new Error('AUTH_ERROR: Foundry rechazó la credencial. Configura una clave nueva válida.');
    }
    if (status === 429) {
      throw new Error('QUOTA_ERROR: Foundry alcanzó su límite de solicitudes o cuota. Intenta más tarde.');
    }
    if (status === 400) {
      const errText = await response.text().catch(() => '');
      throw new Error(`PARAM_ERROR: Foundry rechazó los parámetros de generación: ${errText}`);
    }
    throw new Error(`UPSTREAM_ERROR: Foundry respondió con estado ${status}.`);
  }

  const data: any = await response.json();
  const b64Json = data?.data?.[0]?.b64_json;
  if (!b64Json) {
    throw new Error('INVALID_RESPONSE: Foundry respondió sin una imagen válida.');
  }

  const imageBuffer = Buffer.from(b64Json, 'base64');
  return {
    imageBuffer,
    b64Json,
    seed: options.seed,
    width: options.width,
    height: options.height,
    format: options.format === 'jpeg' ? 'jpeg' : 'png',
  };
}
