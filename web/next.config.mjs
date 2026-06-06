/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Product images are served by Django from /media. We render them with a
  // plain <img>, so no remote image domains need to be configured here.
};

export default nextConfig;
