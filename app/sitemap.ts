import type { MetadataRoute } from "next";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const PUBLIC_ROUTES = [
  "/",
  "/firms",
  "/compare",
  "/discounts",
  "/polls",
  "/articles",
  "/cooperation",
  "/lottery",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = (
    process.env.NEXT_PUBLIC_SITE_URL || "https://propbin.com"
  ).replace(/\/+$/, "");

  const pages: MetadataRoute.Sitemap = PUBLIC_ROUTES.map((route) => ({
    url: `${origin}${route}`,
    changeFrequency: route === "/" ? "daily" : "weekly",
    priority: route === "/" ? 1 : route === "/articles" || route === "/firms" ? 0.8 : 0.6,
  }));

  try {
    const { data, error } = await getSupabaseAdmin()
      .from("articles")
      .select("slug,published_at,updated_at")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(5000);

    if (error) throw error;

    const articlePages: MetadataRoute.Sitemap = (data ?? [])
      .filter((article: { slug?: string }) =>
        typeof article.slug === "string" && /^[a-zA-Z0-9_-]+$/.test(article.slug)
      )
      .map((article: {
        slug: string;
        updated_at?: string | null;
        published_at?: string | null;
      }) => ({
        url: `${origin}/articles/${encodeURIComponent(article.slug)}`,
        lastModified: article.updated_at || article.published_at || undefined,
        changeFrequency: "monthly" as const,
        priority: 0.6,
      }));

    return [...pages, ...articlePages];
  } catch (error) {
    // A temporary database outage must not make the entire sitemap return 500.
    console.error("Sitemap article lookup failed; returning public routes only:", error);
    return pages;
  }
}
