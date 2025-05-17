/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';

const nextConfig = {
  reactStrictMode: true,
  // Configure for Cloudflare Pages with API support
  // Configure image optimization
  images: {
    domains: ['cdn.runware.ai', 'oaidalleapiprodscus.blob.core.windows.net'],
  },
  // Make sure pages with dynamic routes are generated correctly
  trailingSlash: true,
  // Enable experimental ES module support
  experimental: {
    esmExternals: true,
  },
  // Base path for deployment
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  // Asset prefix for CDN
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH ? 
    `${process.env.NEXT_PUBLIC_BASE_PATH}/` : '',
};

export default nextConfig;
