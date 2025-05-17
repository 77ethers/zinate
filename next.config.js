/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  images: {
    unoptimized: true,
  },
  // Make sure pages with dynamic routes are generated correctly
  trailingSlash: true,
};

module.exports = nextConfig;
