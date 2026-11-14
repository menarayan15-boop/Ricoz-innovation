/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // Determine the backend target URL from environment variables
    const targetUrl =
      process.env.BACKEND_URL ||
      (process.env.NEXT_PUBLIC_API_URL
        ? process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/v1\/?$/, '')
        : null);

    if (targetUrl && !targetUrl.includes('localhost:3001')) {
      return [
        {
          source: '/api/v1/:path*',
          destination: `${targetUrl}/api/v1/:path*`,
        },
      ];
    }

    return [];
  },
};

export default nextConfig;
