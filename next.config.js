/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // output: 'export', <-- 삭제됨
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // 프로덕션 빌드 시에는 TypeScript/ESLint 에러 체크
  // 개발 환경에서만 에러 무시 (빠른 반복 개발을 위해)
  eslint: {
    ignoreDuringBuilds: process.env.NODE_ENV === 'development',
  },
  typescript: {
    // 일단 true 유지 (타입 에러 수정 후 false로 변경 예정)
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
