/** @type {import('next').NextConfig} */
const nextConfig = {
  // Base path configuration - ใช้ในทุก mode
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '/stationaryhub',
  
  // Asset prefix สำหรับ static files - ใช้ในทุก mode
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || '/stationaryhub',
  
  // Development server configuration
  devIndicators: {
    buildActivity: true,
    buildActivityPosition: 'bottom-right',
  },
  
  // Basic optimizations
  reactStrictMode: true,
  swcMinify: true,
  
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
  webpack: (config, { isServer, dev }) => {
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
  
  // Environment variables
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000/stationaryhub',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'your-secret-key-here',
    // เพิ่ม environment variables สำหรับ NextAuth.js
    NEXTAUTH_URL_DEV: 'http://localhost:3000/stationaryhub',
    NEXTAUTH_URL_PROD: process.env.NEXTAUTH_URL || 'http://localhost:3001/stationaryhub',
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
    ]
  },
}

export default nextConfig
