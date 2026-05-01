import type { NextConfig } from 'next';

// Allow next/image to optimize Supabase Storage URLs.
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : 'placeholder.supabase.co';

const nextConfig: NextConfig = {
  images: {
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
