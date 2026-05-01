'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Fetch the vendor's watermark text once on mount. Returns the trimmed text
 * if watermarking is enabled, else `null`. Uploaders call resizeForUpload
 * with this string to burn the watermark in client-side.
 */
export function useWatermarkText(vendorId: string): string | null {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('profiles')
        .select('watermark_enabled, watermark_text, display_name, handle')
        .eq('id', vendorId)
        .maybeSingle();
      if (cancelled || !data) return;
      if (!data.watermark_enabled) return;
      const wm =
        data.watermark_text?.trim() ||
        data.display_name?.trim() ||
        data.handle?.trim();
      if (wm) setText(wm);
    })();
    return () => {
      cancelled = true;
    };
  }, [vendorId]);

  return text;
}
