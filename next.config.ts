import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: [
    'http://192.168.132.30:3004',
    'http://192.168.132.30',
    '192.168.132.30',
  ],
  images: {
    // เปิดใช้งาน image optimization
    unoptimized: false,
    // กำหนด formats ที่รองรับ
    formats: ['image/avif', 'image/webp'],
    // กำหนด device sizes สำหรับ responsive images
    deviceSizes: [640, 750, 828, 1080, 1200],
    // กำหนด image sizes สำหรับ static images
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    // กำหนด minimum cache time (seconds)
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },
  async headers() {
    return [
      {
        // Apply to all routes - prevent caching of HTML pages
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
      {
        // Allow caching for static assets
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Service worker should not be cached
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/api/uploads/:path*',
      },
    ];
  },
};

export default nextConfig;
