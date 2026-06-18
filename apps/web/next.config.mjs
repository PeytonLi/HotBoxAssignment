/** @type {import('next').NextConfig} */
const nextConfig = {
  // Internal TS packages are consumed as source; let Next transpile them.
  transpilePackages: ["@hotbox/schema", "@hotbox/db"],
};

export default nextConfig;
