/** @type {import('next').NextConfig} */
const nextConfig = {
  // Basic optimizations
  reactStrictMode: true,
  swcMinify: true,
  
  // Image optimization
  images: {
    domains: [],
    formats: ['image/webp', 'image/avif'],
  },
  
  // Webpack optimizations
  webpack: (config, { isServer }) => {
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
}

export default nextConfig
