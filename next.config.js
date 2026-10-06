/**
 * File: next.config.js
 *
 * Responsibility:
 * Next.js application runtime configuration settings and compiler options.
 *
 * Layer:
 * Frontend / Configuration
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
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

