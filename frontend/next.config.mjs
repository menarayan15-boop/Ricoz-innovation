/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // Determine the backend target URL:
    // 1. BACKEND_URL environment variable
    // 2. Extracted from NEXT_PUBLIC_API_URL
    // 3. Production Vercel backend deployment: https://ricoz-backend.vercel.app
    const targetUrl =
      process.env.BACKEND_URL ||
      (process.env.NEXT_PUBLIC_API_URL
        ? process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/v1\/?$/, '')
        : 'https://ricoz-backend.vercel.app');

    return [
      {
        source: '/api/v1/:path*',
        destination: `${targetUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
