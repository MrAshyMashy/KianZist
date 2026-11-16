import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Standard web app configuration
  reactStrictMode: true,

  // Images are unoptimized for now (can be changed if you use next/image heavily)
  images: {
    unoptimized: true,
  },

  // Prevent Next.js from picking up a parent-directory lockfile
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
