import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Required for the Docker multi-stage build (Stage 3 copies .next/standalone)
  output: 'standalone',
};

export default nextConfig;
