import type { NextConfig } from 'next';

// Allow next/image to optimize Supabase Storage URLs.
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : 'placeholder.supabase.co';

const nextConfig: NextConfig = {
  images: {
    // Bypass Vercel's image optimization service (quota-limited on hobby tier).
    // Files are already client-resized to 1600px max + JPEG q85 on upload, so
    // serving them direct from Supabase storage (Cloudflare-fronted) is fine.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: supabaseHost,
        pathname: '/storage/v1/object/public/photos/**',
      },
    ],
  },
};

export default nextConfig;
