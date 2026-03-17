/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,

  // Disable ESLint during builds to reduce CPU load
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Use Turbopack in production (Next.js 16 default)
  // This prevents conflicts with webpack config
  turbopack: {},

  // Optimize webpack file watching in development
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
        ignored: ["**/node_modules", "**/.next", "**/dist", "**/.git"],
      };
    }
    return config;
  },
};

export default nextConfig;
