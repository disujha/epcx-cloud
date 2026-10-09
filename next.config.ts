import type { NextConfig } from "next";

const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "epcxsite.firebaseapp.com";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/pilot-drafts", destination: "/saved-drafts", permanent: true },
      { source: "/billing", destination: "/pricing", permanent: false },
      { source: "/workspace", destination: "/start", permanent: false },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/__/auth/:path*",
        destination: `https://${authDomain}/__/auth/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
};

export default nextConfig;
