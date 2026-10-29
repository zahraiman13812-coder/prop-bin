import type { Metadata } from "next";
import Link from "next/link";

import { getContent } from "@/lib/content";
import { jsonLdString } from "@/lib/article-seo";
import ArticleCard from "@/components/ArticleCard";
import { getPublishedArticles } from "@/lib/supabase-articles";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "مقالات و آموزش پراپ",
  description:
    "مقالات آموزشی و تحلیلی درباره شرکت‌های پراپ، مدیریت ریسک، دراودان و انتخاب چالش مناسب؛ همراه با راهنمای خرید و مقایسه.",
  keywords: [
    "مقالات پراپ",
    "آموزش پراپ",
    "مدیریت ریسک",
    "دراودان",
    "چالش پراپ",
  ],
  alternates: {
    canonical: "/articles",
    types: {
      "application/rss+xml": "/articles/feed.xml",
    },
  },
  openGraph: {
    type: "website",
    title: "مقالات و آموزش پراپ",
    description:
      "راهنماهای کوتاه و کاربردی برای شناخت شرکت‌های پراپ و تصمیم‌گیری بهتر.",
    url: "/articles",
    locale: "fa_IR",
    images: ["/pb-logo.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "مقالات و آموزش پراپ",
    description:
      "راهنماهای کوتاه و کاربردی برای شناخت شرکت‌های پراپ.",
    images: ["/pb-logo.png"],
  },
};

export default async function ArticlesPage() {
  const [{ settings }, articles] = await Promise.all([
  getContent(),
  getPublishedArticles(),
]);

  const origin = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000"
  ).replace(/\/+$/, "");

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `مقالات ${settings.name}`,
    itemListElement: articles.map(
      (article, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${origin}/articles/${article.slug}`,
        name: article.title,
      })
    ),
  };

  return (
    <div className="page-shell">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdString(itemList),
        }}
      />

      <div className="container">
        <div className="page-heading">
          <span className="eyebrow">
            مجله پراپ بین
          </span>
          <h1>
            مقالات و <em>آموزش</em>
          </h1>
          <p>
            راهنماهای کوتاه و کاربردی برای شناخت
            شرکت‌های پراپ و تصمیم‌گیری بهتر.
          </p>
        </div>

        <div className="article-grid article-grid-page">
          {articles.map((article) => (
            <ArticleCard
              key={article.slug}
              article={article}
            />
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-theme bg-surface p-4 text-xs text-muted">
          <span>
            {articles.length.toLocaleString("fa-IR")}{" "}
            مقاله منتشرشده
          </span>

          <Link
            href="/articles/feed.xml"
            className="text-primary hover:underline"
          >
            اشتراک در خوراک RSS
          </Link>
        </div>
      </div>
    </div>
  );
}
