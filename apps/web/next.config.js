/**
 * Next.js Configuration for CoLink Commerce Platform
 */
const { i18n } = require('./next-i18next.config');
const withBundleAnalyzer = process.env.ANALYZE === 'true' 
  ? require('@next/bundle-analyzer')({ enabled: true })
  : (config) => config;

/**
 * Validate required environment variables
 */
const requiredEnvVars = [
  'NEXT_PUBLIC_API_URL',
  'NEXT_PUBLIC_APP_NAME',
];

// Only require Clerk variables if not using Auth0
if (process.env.NEXT_PUBLIC_USE_AUTH0 !== 'true') {
  requiredEnvVars.push(
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY'
  );
}

// Check for missing environment variables
const missingEnvVars = requiredEnvVars.filter(
  (envVar) => !process.env[envVar]
);

if (missingEnvVars.length > 0) {
  console.error('\x1b[31m%s\x1b[0m', 'Error: Missing required environment variables:');
  missingEnvVars.forEach((envVar) => {
    console.error(`  - ${envVar}`);
  });
  console.error('Please check your .env file and ensure all required variables are set.');
  
  // Only exit in production to allow development without all variables
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // TypeScript configuration
  typescript: {
    // Dangerously allow production builds to successfully complete even with type errors
    ignoreBuildErrors: process.env.IGNORE_TS_ERRORS === 'true',
  },
  
  // Support for i18n
  i18n,
  
  // Image optimization configuration
  images: {
    domains: [
      'localhost',
      'res.cloudinary.com',
      'images.unsplash.com',
      'colink-commerce-assets.s3.amazonaws.com',
      'storage.googleapis.com',
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  },
  
  // API and path rewrites
  async rewrites() {
    return [
      // API rewrites to backend
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/:path*`,
      },
      // Campaign page rewrites
      {
        source: '/c/:creator/:campaign',
        destination: '/campaign/:creator/:campaign',
      },
      // Short link rewrites
      {
        source: '/s/:shortCode',
        destination: '/api/redirect/:shortCode',
      },
    ];
  },
  
  // Redirects
  async redirects() {
    return [
      {
        source: '/dashboard',
        destination: '/dashboard/overview',
        permanent: true,
      },
    ];
  },
  
  // Webpack configuration
  webpack(config, { isServer }) {
    // SVG support
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });
    
    // Add support for importing Markdown files
    config.module.rules.push({
      test: /\.md$/,
      use: 'raw-loader',
    });
    
    // Enable tree shaking and optimize module concatenation
    config.optimization.usedExports = true;
    
    return config;
  },
  
  // Disable x-powered-by header
  poweredByHeader: false,
  
  // Enable compression
  compress: true,
  
  // Output directory
  distDir: '.next',
  
  // Environment variables available on the client
  env: {
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'CoLink Commerce',
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || '0.1.0',
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
    NEXT_PUBLIC_ENABLE_ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS || 'false',
    NEXT_PUBLIC_USE_MOCK_DATA: process.env.NEXT_PUBLIC_USE_MOCK_DATA || 'false',
  },
  
  // Experimental features
  experimental: {
    serverActions: true,
    serverComponentsExternalPackages: ['@prisma/client'],
    optimizeCss: true,
  },
};

module.exports = withBundleAnalyzer(nextConfig);
