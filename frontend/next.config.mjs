// @ts-check

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow MDX content loading
  pageExtensions: ["ts", "tsx", "js", "jsx", "md", "mdx"],

  // Allow images from external sources
  images: {
    domains: ["avatars.githubusercontent.com"],
  },

  // Suppress known non-breaking warnings from MetaMask SDK + WalletConnect
  webpack: (config, { isServer }) => {
    // Fix for pino-pretty (WalletConnect dep, not needed in browser)
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "pino-pretty": false,
      "@react-native-async-storage/async-storage": false,
    };

    return config;
  },
};

export default nextConfig;
