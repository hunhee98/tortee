/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['placehold.co', 'localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8080',
      },
    ],
  },
  eslint: {
    // 빌드 시 ESLint 에러가 있어도 빌드를 계속 진행
    ignoreDuringBuilds: true,
  },
  typescript: {
    // 빌드 시 TypeScript 에러가 있어도 빌드를 계속 진행
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
