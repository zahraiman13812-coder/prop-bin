
import type { MetadataRoute } from "next";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000"
  ).replace(/\/+$/, "");

  const paths = [
    "/",
    "/firms",
    "/compare",
    "/discounts",
    "/polls",
    "/articles",
  ];

  const pages: MetadataRoute.Sitemap = paths.map((route) => ({
    url: `${origin}${route}`,
    changeFrequency: route === "/" ? "daily" : "weekly",
    priority: route === "/" ? 1 : 0.7,
  }));

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("articles")
    .select("slug, published_at, updated_at")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (error) {
    console.error("Sitemap articles error:", error);
    throw new Error("Failed to generate article sitemap");
  }

  const articlePages: MetadataRoute.Sitemap = (data ?? []).map(
  (article: {
    slug: string;
    updated_at?: string | null;
    published_at?: string | null;
  }) => ({
      url: `${origin}/articles/${encodeURIComponent(article.slug)}`,
      lastModified:
        article.updated_at || article.published_at || undefined,
      changeFrequency: "monthly",
      priority: 0.6,
    })
  );

  return [...pages, ...articlePages];
}
