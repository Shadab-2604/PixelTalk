/**
 * File: next.config.js
 *
 * Responsibility:
 * Next.js application runtime configuration settings and compiler options:
 * - Disables production source maps to protect intellectual property and shrink payload
 * - Enables SWC minification and Gzip/Brotli compression to shrink JS bundles
 * - Strips sensitive debugging console statements in production builds
 * - Configures strict security response headers and Webpack fallbacks
 *
 * Layer:
 * Frontend / Configuration
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  swcMinify: true,
  compress: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  experimental: {
    serverComponentsExternalPackages: [
      'socket.io-client',
      'engine.io-client',
      'socket.io-parser',
      'xmlhttprequest-ssl',
      'ms',
      'ws',
      'bufferutil',
      'utf-8-validate',
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=()' },
        ],
      },
    ];
  },
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // Disable Webpack persistent disk caching in dev on Windows to prevent PackFileCacheStrategy lstat ENOENT & stale asset 404s
      config.cache = false;
    }
    if (isServer) {
      config.externals = [...(config.externals || []), 'bufferutil', 'utf-8-validate', 'ws', 'socket.io-client'];
    } else {
      config.resolve = config.resolve || {};
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        fs: false,
        net: false,
        tls: false,
        ws: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
