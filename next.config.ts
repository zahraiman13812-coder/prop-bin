
import path from "node:path";
import type { NextConfig } from "next";

const supabaseUrl = process.env.SUPABASE_URL;

const remotePatterns: NonNullable<
  NextConfig["images"]
>["remotePatterns"] = [];

if (supabaseUrl) {
  const url = new URL(supabaseUrl);

  remotePatterns.push({
    protocol: "https",
    hostname: url.hostname,
    pathname:
      "/storage/v1/object/public/article-images/**",
  });
}

const nextConfig: NextConfig = {
  poweredByHeader: false,

  
images: {
  remotePatterns: [
    {
      protocol: "https",
      hostname: "zonoonbgqixsythpqoxq.supabase.co",
      port: "",
      pathname:
        "/storage/v1/object/public/article-images/**",
    },
  ],
},


  outputFileTracingRoot: path.resolve(
    process.cwd()
  ),
};

export default nextConfig;
