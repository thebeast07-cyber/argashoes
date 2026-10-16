/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // PGlite membawa file WASM sendiri, jangan di-bundle oleh webpack.
    serverComponentsExternalPackages: ["@electric-sql/pglite"],
    // File import CSV dikirim lewat server action; batas bawaan 1 MB.
    serverActions: { bodySizeLimit: "2mb" },
  },
};

export default nextConfig;
