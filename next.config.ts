import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/dungca-blog",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;