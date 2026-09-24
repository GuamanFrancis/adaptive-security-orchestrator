const MAX_SOURCE_BYTES = 30 * 1024 * 1024;
const MAX_PIXELS = 32_000_000;
const MAX_OUTPUT_BYTES = 6 * 1024 * 1024;

export async function prepareReference(file: File): Promise<File> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('La referencia debe ser JPG, PNG o WebP.');
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error('La referencia original supera 30 MB.');
  }
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width * bitmap.height > MAX_PIXELS) {
      throw new Error('La referencia tiene demasiados píxeles.');
    }
    const ratio = Math.min(1, 1024 / bitmap.width, 1024 / bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No se pudo preparar la referencia.');
    // Draw on white background in case of PNG transparency
    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
    if (!blob || blob.size > MAX_OUTPUT_BYTES) throw new Error('La referencia optimizada supera 6 MB.');
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
  } finally {
    bitmap.close();
  }
}

export async function urlToFile(url: string, filename = 'reference.png'): Promise<File> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`No se pudo cargar la imagen desde "${url}" (HTTP ${res.status}).`);
  }
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type || 'image/png' });
}
