/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // PGlite membawa file WASM sendiri, jangan di-bundle oleh webpack.
    serverComponentsExternalPackages: ["@electric-sql/pglite"],
  },
};

export default nextConfig;
