
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const origin = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://propbin.com"
  ).replace(/\/+$/, "");

  return {
    rules: {
      userAgent: "*",

      allow: "/",

      disallow: [
        "/admin",
        "/admin-login",
        "/account",
        "/login",
        "/demo",
        "/demo-account",
        "/demo-admin",
        "/api/",
      ],
    },

    sitemap: `${origin}/sitemap.xml`,
  };
}
