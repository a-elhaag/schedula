/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,

  // Use Turbopack and pin the workspace root to avoid lockfile ambiguity
  turbopack: {
    root: process.cwd(),
  },

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
