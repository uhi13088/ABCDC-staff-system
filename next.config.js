/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export', // 🔥 Firebase Hosting용 Static Export
  images: {
    unoptimized: true, // Static Export에서는 Image Optimization 비활성화 필요
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
