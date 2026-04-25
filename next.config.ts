import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export", // Static export for GCS hosting
  trailingSlash: true, // Required for GCS static hosting
  images: {
    unoptimized: true, // next/image optimization requires a server
  },
};

export default nextConfig;
