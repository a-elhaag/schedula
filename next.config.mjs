/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,
  async redirects() {
    return [
      {
        source: "/staff/availability/page",
        destination: "/staff/availability",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
