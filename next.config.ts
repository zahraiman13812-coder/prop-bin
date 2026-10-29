import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "zonoonbgqixsythpqoxq.supabase.co",
        pathname: "/storage/v1/object/public/article-images/**",
      },
    ],
  },
  outputFileTracingRoot: path.resolve(process.cwd()),
};

export default nextConfig;
