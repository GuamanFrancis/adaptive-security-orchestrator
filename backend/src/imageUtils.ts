import sharp from 'sharp';

export interface ProcessedImage {
  buffer: Buffer;
  width: number;
  height: number;
  format: string;
}

export async function processReferenceImage(
  buffer: Buffer,
  maxBytes = 20 * 1024 * 1024
): Promise<Buffer> {
  if (buffer.length > maxBytes) {
    throw new Error('REFERENCIA_DEMASIADO_GRANDE');
  }

  try {
    const pipeline = sharp(buffer).rotate();
    const metadata = await pipeline.metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error('REFERENCIA_INVALIDA');
    }

    if (metadata.width * metadata.height > 32_000_000) {
      throw new Error('RESOLUCION_EXCEDIDA');
    }

    // Convert to RGB JPEG / PNG normalized buffer
    return await pipeline.toFormat('jpeg', { quality: 95 }).toBuffer();
  } catch (err: any) {
    if (err.message === 'REFERENCIA_DEMASIADO_GRANDE' || err.message === 'RESOLUCION_EXCEDIDA') {
      throw err;
    }
    throw new Error('REFERENCIA_INVALIDA');
  }
}

export async function imageToBase64Hq(imageBuffer: Buffer, format = 'jpeg'): Promise<string> {
  let out: Buffer;
  if (format === 'png') {
    out = await sharp(imageBuffer).png().toBuffer();
  } else {
    out = await sharp(imageBuffer).jpeg({ quality: 95 }).toBuffer();
  }
  return out.toString('base64');
}

export async function buildIdentityPack(
  images: Buffer[],
  layout = '2x3',
  cellSize = 384,
  border = 10,
  bgHex = '#0b1220'
): Promise<Buffer> {
  if (!images.length) {
    throw new Error('Se requiere al menos una imagen de referencia.');
  }

  const selected = images.slice(0, 6);
  const rows = layout === '3x2' ? 3 : 2;
  const cols = layout === '3x2' ? 2 : 3;

  while (selected.length < rows * cols) {
    selected.push(selected[selected.length - 1]);
  }

  const cell = Math.max(128, Math.min(640, Math.floor(cellSize)));
  const b = Math.max(0, Math.min(32, Math.floor(border)));
  const packWidth = cols * cell + (cols + 1) * b;
  const packHeight = rows * cell + (rows + 1) * b;

  const validBg = /^#[0-9a-fA-F]{6}$/.test(bgHex) ? bgHex : '#0b1220';

  // Resize each tile
  const resizedTiles = await Promise.all(
    selected.map((buf) =>
      sharp(buf)
        .rotate()
        .resize(cell, cell, { fit: 'cover', position: 'center' })
        .toFormat('jpeg', { quality: 95 })
        .toBuffer()
    )
  );

  const compositeList = [];
  let idx = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = b + c * (cell + b);
      const y = b + r * (cell + b);
      compositeList.push({
        input: resizedTiles[idx],
        top: y,
        left: x,
      });
      idx++;
    }
  }

  return await sharp({
    create: {
      width: packWidth,
      height: packHeight,
      channels: 3,
      background: validBg,
    },
  })
    .composite(compositeList)
    .jpeg({ quality: 95 })
    .toBuffer();
}
