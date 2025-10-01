/** @type {import('next').NextConfig} */

const basePath = '/stationaryhub';

const nextConfig = {
  // Base path configuration - ใช้ในทุก mode
  basePath: basePath,
  assetPrefix: basePath,

  // Development server configuration
  devIndicators: {
    buildActivity: true,
    buildActivityPosition: 'bottom-right'
  },

  // Basic optimizations
  reactStrictMode: true,
  swcMinify: true,

  // Experimental features
  experimental: {
    // Fix CSS preload warning
    optimizePackageImports: ['@/components'],
    // เพิ่มการตั้งค่าเพื่อลด CSS preload warning
    optimizeCss: true
  },

  // Output configuration for Docker
  output: 'standalone',

  // Image optimization
  images: {
    domains: [],
    formats: ['image/webp', 'image/avif'],
    // เพิ่ม unoptimized สำหรับ development
    unoptimized: process.env.NODE_ENV === 'development'
  },

  // เพิ่มการตั้งค่าเพื่อแก้ไข CSS preload warning
  poweredByHeader: false,

  // Webpack optimizations
  webpack: (config, { isServer, _dev }) => {
    // Fix for self is not defined error
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false
      };
    }

    // เพิ่มการตั้งค่าเพื่อลด CSS preload warning
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization.splitChunks,
          cacheGroups: {
            ...config.optimization.splitChunks.cacheGroups,
            styles: {
              name: 'styles',
              test: /\.(css|scss)$/,
              chunks: 'all',
              enforce: true
            }
          }
        }
      };
    }

    return config;
  },

  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
  },

  // ESLint - ignore warnings during production build output
  eslint: {
    ignoreDuringBuilds: true
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath
  }
};

module.exports = nextConfig;
