import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Don't bundle these packages for server-side
      config.externals = config.externals || [];
      config.externals.push({
        '@mysten/sui': 'commonjs @mysten/sui',
        'tweetnacl': 'commonjs tweetnacl',
      });
    }
    return config;
  },
  // Disable experimental features that might cause issues
  experimental: {
    serverComponentsExternalPackages: ['@mysten/sui'],
  },
};

export default nextConfig;
