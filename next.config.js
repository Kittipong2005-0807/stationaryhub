/** @type {import('next').NextConfig} */
const nextConfig = {
  // Base path configuration - ใช้ในทุก mode
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '/stationaryhub',
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || '/stationaryhub',
  
  // Fix for static files in development
  ...(process.env.NODE_ENV === 'development' && {
    // Disable asset prefix in development to fix static files
    assetPrefix: '',
  }),
  
  // Development server configuration
  devIndicators: {
    buildActivity: true,
    buildActivityPosition: 'bottom-right',
  },
  
  // Basic optimizations
  reactStrictMode: true,
  swcMinify: true,
  
  // Experimental features
  experimental: {
    // Fix CSS preload warning
    optimizePackageImports: ['@/components'],
  },
  
  // Output configuration for Docker
  output: 'standalone',
  
  // Image optimization
  images: {
    domains: [],
    formats: ['image/webp', 'image/avif'],
    // เพิ่ม unoptimized สำหรับ development
    unoptimized: process.env.NODE_ENV === 'development',
  },


  
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
        path: false,
      }
    }
    
    return config;
  },
  
  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // ESLint - ignore warnings during production build output
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Environment variables
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000/stationaryhub',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'your-secret-key-here',
    // เพิ่ม environment variables สำหรับ NextAuth.js
    NEXTAUTH_URL_DEV: 'http://localhost:3000/stationaryhub',
    NEXTAUTH_URL_PROD: process.env.NEXTAUTH_URL || 'http://localhost:3000/stationaryhub',
  },
  
  // Headers configuration
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
      {
        source: '/_next/static/css/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ]
  },
}

export default nextConfig
