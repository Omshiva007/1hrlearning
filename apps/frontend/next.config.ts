// Frontend build behavior, image policy, and shared-package transpilation live in this configuration.
import type { NextConfig } from 'next';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? (process.env.NODE_ENV === 'development' ? 'http://localhost:4000/api/v1' : undefined);
if (!apiUrl) throw new Error('NEXT_PUBLIC_API_URL is required for production builds');

const nextConfig: NextConfig = {
  // Development and production commands may run during the same acceptance session; separate
  // artifacts so `next build` cannot invalidate chunks served by `next dev`.
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-avatar'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiUrl}/:path*`,
      },
      {
        source: '/api/backend/:path*',
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
  async redirects() {
    return [
      // Keep every onboarding step inside its guarded route group; only the bare entry needs a canonical step.
      { source: '/onboarding', destination: '/onboarding/profile', permanent: false },
      { source: '/auth/login', destination: '/login', permanent: false },
      { source: '/auth/register', destination: '/register', permanent: false },
    ];
  },
};

export default nextConfig;
