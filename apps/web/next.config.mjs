/** @type {import('next').NextConfig} */
const nextConfig = {
  // Internal TS package is consumed as source; let Next transpile it.
  transpilePackages: ["@hotbox/schema"],
};

export default nextConfig;
