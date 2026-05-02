'use client';

// Lazy-loaded so the ~30MB ML model isn't pulled into pages that don't use it.
let modPromise: Promise<typeof import('@imgly/background-removal')> | null = null;
function loadMod() {
  if (!modPromise) modPromise = import('@imgly/background-removal');
  return modPromise;
}

/** Run background removal on an image URL. Returns a transparent PNG blob. */
export async function removeBackground(url: string): Promise<Blob> {
  const lib = await loadMod();
  return lib.removeBackground(url);
}

export type Background =
  | { kind: 'color'; hex: string }
  | { kind: 'image'; blob: Blob };

/**
 * Composite a transparent image onto a background (solid color OR image),
 * re-encoded as JPEG. Backgrounds are scaled with object-fit: cover.
 *
 * Hardens the foreground alpha channel before drawing so the product
 * doesn't look "see-through" against the chosen background. Pixels with
 * very low alpha get killed (background bleed), pixels in the middle get
 * boosted, and clearly-foreground pixels stay fully opaque. Soft edges
 * still get smoothed onto the new background.
 */
export async function composite(
  transparentBlob: Blob,
  background: Background,
  quality = 0.9,
): Promise<{ blob: Blob; width: number; height: number }> {
  const fg = await loadImage(transparentBlob);
  const { naturalWidth: w, naturalHeight: h } = fg;

  // 1) Pre-process the transparent foreground: harden the alpha channel.
  const fgCanvas = document.createElement('canvas');
  fgCanvas.width = w;
  fgCanvas.height = h;
  const fgCtx = fgCanvas.getContext('2d');
  if (!fgCtx) throw new Error('Canvas 2D context unavailable');
  fgCtx.drawImage(fg, 0, 0, w, h);
  const fgData = fgCtx.getImageData(0, 0, w, h);
  const px = fgData.data;
  for (let i = 3; i < px.length; i += 4) {
    const a = px[i];
    if (a < 40) {
      px[i] = 0; // background bleed → transparent
    } else if (a > 200) {
      px[i] = 255; // clearly foreground → opaque
    } else {
      // Mid-range: boost so the product looks more solid, soft-clamp to 255.
      px[i] = Math.min(255, Math.round(a * 1.45));
    }
  }
  fgCtx.putImageData(fgData, 0, 0);

  // 2) Composite hardened foreground onto chosen background.
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  if (background.kind === 'color') {
    ctx.fillStyle = background.hex;
    ctx.fillRect(0, 0, w, h);
  } else {
    const bg = await loadImage(background.blob);
    const bw = bg.naturalWidth;
    const bh = bg.naturalHeight;
    // object-fit: cover — scale to fill, crop overflow centered
    const scale = Math.max(w / bw, h / bh);
    const sw = w / scale;
    const sh = h / scale;
    const sx = (bw - sw) / 2;
    const sy = (bh - sh) / 2;
    ctx.drawImage(bg, sx, sy, sw, sh, 0, 0, w, h);
  }

  ctx.drawImage(fgCanvas, 0, 0, w, h);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', quality),
  );
  if (!blob) throw new Error('Could not encode result');
  return { blob, width: w, height: h };
}

/** @deprecated use composite(blob, { kind: 'color', hex }) */
export async function compositeOnColor(
  transparentBlob: Blob,
  bgColor: string,
  quality = 0.9,
): Promise<{ blob: Blob; width: number; height: number }> {
  return composite(transparentBlob, { kind: 'color', hex: bgColor }, quality);
}

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
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
