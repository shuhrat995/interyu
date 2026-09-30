/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    outputFileTracingIncludes: {
      "/*": ["./prisma/dev.db"],
      "/api/*": ["./prisma/dev.db"],
      "/api/**/*": ["./prisma/dev.db"]
    }
  }
};
export default nextConfig;
