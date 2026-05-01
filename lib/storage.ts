const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export type PhotoUrlOptions = {
  /** Width in px. Resize using Supabase image transforms. */
  width?: number;
  /** Height in px. */
  height?: number;
  /** JPEG/WebP quality, 1-100. Default Supabase: 80. */
  quality?: number;
  /** Resize mode. Default Supabase: cover. */
  resize?: 'cover' | 'contain' | 'fill';
};

/**
 * Public URL for a photo stored in the `photos` bucket.
 *
 * Without options → original-size URL (works on Supabase free tier).
 * With options    → server-side transformed URL (requires Supabase Pro tier).
 *
 * To upgrade later: switch callers from `photoUrl(key)` to `photoUrl(key, { width: 600 })`
 * for thumbnails. Free tier returns 402 on /render/image/, so don't use opts there.
 */
export function photoUrl(storageKey: string, opts?: PhotoUrlOptions): string {
  if (!opts || (!opts.width && !opts.height)) {
    return `${SUPABASE_URL}/storage/v1/object/public/photos/${storageKey}`;
  }
  const params = new URLSearchParams();
  if (opts.width) params.set('width', String(opts.width));
  if (opts.height) params.set('height', String(opts.height));
  if (opts.quality) params.set('quality', String(opts.quality));
  if (opts.resize) params.set('resize', opts.resize);
  return `${SUPABASE_URL}/storage/v1/render/image/public/photos/${storageKey}?${params}`;
}

// ─────────────────────────────────────────────────────────────────────
// Client-side resize (free, works on any tier)
// ─────────────────────────────────────────────────────────────────────

const MAX_DIM = 1600; // px on the longest edge — looks crisp on retina
const QUALITY = 0.85; // JPEG quality

export type ResizedImage = {
  blob: Blob;
  width: number;
  height: number;
  type: string;
};

export type ResizeOptions = {
  /** If set, draws this text as a watermark on the bottom-right. */
  watermarkText?: string | null;
};

/**
 * Resize an image client-side before upload. Caps the longest edge at MAX_DIM
 * and re-encodes to JPEG at QUALITY. Optionally burns in a text watermark.
 */
export async function resizeForUpload(
  file: File,
  opts: ResizeOptions = {},
): Promise<ResizedImage> {
  const img = await loadImage(file);
  const { naturalWidth: srcW, naturalHeight: srcH } = img;
  const watermark = opts.watermarkText?.trim();

  // Skip re-encoding only when small AND no watermark to apply.
  if (!watermark && srcW <= MAX_DIM && srcH <= MAX_DIM) {
    return { blob: file, width: srcW, height: srcH, type: file.type };
  }

  const ratio = srcW > MAX_DIM || srcH > MAX_DIM
    ? Math.min(MAX_DIM / srcW, MAX_DIM / srcH)
    : 1;
  const dstW = Math.round(srcW * ratio);
  const dstH = Math.round(srcH * ratio);

  const canvas = document.createElement('canvas');
  canvas.width = dstW;
  canvas.height = dstH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.drawImage(img, 0, 0, dstW, dstH);

  if (watermark) drawWatermark(ctx, dstW, dstH, watermark);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', QUALITY),
  );
  if (!blob) throw new Error('Could not encode image');
  return { blob, width: dstW, height: dstH, type: 'image/jpeg' };
}

function drawWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  text: string,
): void {
  const padding = Math.max(width * 0.02, 12);
  const fontSize = Math.max(Math.round(width * 0.028), 14);
  ctx.save();
  ctx.font = `500 ${fontSize}px system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 1;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText(text, width - padding, height - padding);
  ctx.restore();
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not load image'));
    };
    img.src = url;
  });
}
