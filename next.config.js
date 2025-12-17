/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // output: 'export',  <-- ❌ 삭제 (API Route 사용을 위해 필수)
  images: {
    // unoptimized: true, <-- ❌ 삭제 (Firebase 호스팅이 이미지 최적화 지원함)
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
