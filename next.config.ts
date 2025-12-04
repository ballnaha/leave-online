import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
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
