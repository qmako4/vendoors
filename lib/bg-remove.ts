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

/**
 * Composite a transparent image onto a solid colored background and re-encode
 * as JPEG. This is what we save back to storage.
 */
export async function compositeOnColor(
  transparentBlob: Blob,
  bgColor: string,
  quality = 0.9,
): Promise<{ blob: Blob; width: number; height: number }> {
  const img = await loadImage(transparentBlob);
  const { naturalWidth: w, naturalHeight: h } = img;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  // Fill with chosen color first, then draw the transparent image on top.
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', quality),
  );
  if (!blob) throw new Error('Could not encode result');
  return { blob, width: w, height: h };
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
