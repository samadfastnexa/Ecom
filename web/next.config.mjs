/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Static export for shared hosting (no Node process needed). Produces an
  // `out/` folder of plain HTML/JS uploaded to the admin subdomain.
  output: "export",
  // Each route becomes a folder with index.html so static hosts serve it on refresh.
  trailingSlash: true,
  // next/image optimization needs a server; disable it for static export.
  // Product images are served by Django from /media via plain <img> tags.
  images: { unoptimized: true },
};

export default nextConfig;
