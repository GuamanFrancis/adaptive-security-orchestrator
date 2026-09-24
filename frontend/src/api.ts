export type Session = { email: string; csrf: string };

export type ImageRecord = {
  id: string;
  prompt: string;
  width: number;
  height: number;
  seed: number;
  created_at: string;
  format?: string;
  filename?: string;
};

export type CatalogItem = {
  id: string;
  title: string;
  category: string;
  aspectRatio: string;
  width: number;
  height: number;
  image: string;
  prompt: string;
  camera: string;
  lighting: string;
  tags: string[];
};

export type GenerateResult = {
  id: string;
  seed: number;
  format: string;
  width: number;
  height: number;
  filename: string;
  url: string;
  b64_json?: string;
  prompt: string;
  created_at: string;
};

export type ImageUploadResult = {
  id: string;
  filename: string;
  width: number;
  height: number;
  url: string;
  prompt: string;
  created_at: string;
};

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function request<T>(path: string, options: RequestInit = {}, csrf?: string): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (csrf && options.method && options.method !== 'GET') {
    headers.set('X-CSRF-Token', csrf);
  }
  const response = await fetch(path, { ...options, headers, credentials: 'same-origin' });
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    throw new ApiError(String(data.detail || 'No se pudo completar la solicitud.'), response.status);
  }
  return data as T;
}
