import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getContent } from "@/lib/content";

import {
  getArticleJsonLd,
  getArticleMetadata,
  getBreadcrumbJsonLd,
  jsonLdString,
} from "@/lib/article-seo";

import ArticleBody from "@/components/ArticleBody";
import { getPublishedArticle } from "@/lib/supabase-articles";
import { isValidArticleImage } from "@/lib/article-image";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return getArticleMetadata(slug);
}

export const dynamic = "force-dynamic";

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [
  { settings, articleLottery },
  article
] = await Promise.all([
  getContent(),
  getPublishedArticle(slug),
]);

if (!article) {
  notFound();
}

  if (!article) {
    notFound();
  }

  const image = article.image || "";

  const hasImage = isValidArticleImage(image);

  const articleLd = getArticleJsonLd(
    article,
    settings.name
  );
  const breadcrumbLd = getBreadcrumbJsonLd(article);

  return (
    <div className="min-h-screen bg-background py-8 text-foreground sm:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdString(articleLd),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdString(breadcrumbLd),
        }}
      />

      <article className="mx-auto max-w-[900px] px-4 sm:px-6">
        <nav
          aria-label="مسیر صفحه"
          className="mb-6 flex flex-wrap items-center gap-2 text-xs text-muted"
        >
          <Link
            href="/"
            className="hover:text-primary"
          >
            صفحه اصلی
          </Link>
          <span aria-hidden="true">/</span>
          <Link
            href="/articles"
            className="hover:text-primary"
          >
            مقالات
          </Link>
          <span aria-hidden="true">/</span>
          <span className="truncate text-foreground">
            {article.title}
          </span>
        </nav>

        <div className="relative mt-2 h-[230px] overflow-hidden rounded-2xl bg-surface-secondary sm:h-[380px]">
          {hasImage ? (
            <Image
              src={image}
              alt={article.seoTitle || article.title}
              fill
              priority
              sizes="(max-width: 900px) 100vw, 900px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/20 to-surface-secondary">
              <span className="text-7xl font-bold text-primary">
                {article.icon || "PB"}
              </span>
            </div>
          )}
        </div>

        <header className="mt-6 rounded-2xl border border-border-theme bg-surface p-5 sm:p-9">
          <span className="rounded-lg bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
            {article.category}
          </span>

          <h1 className="mt-5 text-2xl font-extrabold leading-relaxed sm:text-4xl">
            {article.title}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
            {article.publishedAt ? (
              <time
                dateTime={article.publishedAt}
              >
                {article.date}
              </time>
            ) : (
              <span>{article.date}</span>
            )}

            <span>{article.read} مطالعه</span>

            <span>
              نویسنده:{" "}
              {article.author?.trim() || "تیم پراپ بین"}
            </span>
          </div>

          <p className="mt-7 border-b border-border-theme pb-6 text-base leading-9 text-muted">
            {article.excerpt}
          </p>

          <div className="mt-7">
            <ArticleBody body={article.body || ""} />
          </div>

          {articleLottery.enabled && articleLottery.articleSlug === slug && (
            <section className="mt-8 rounded-2xl border border-primary/40 bg-surface-secondary p-5 text-center sm:p-7">
              <h2 className="text-xl font-extrabold">🎟️ {articleLottery.title}</h2>
              <p className="my-4 text-sm leading-8 text-muted">{articleLottery.description}</p>
              <Link href="/lottery?join=1" className="inline-flex rounded-xl bg-primary px-6 py-3 font-bold text-white">شرکت در قرعه‌کشی ←</Link>
            </section>
          )}
          <div className="mt-10 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-secondary p-5 text-xs leading-8 text-muted">
            <span>
              این مقاله صرفاً برای اطلاع‌رسانی و
              آموزش تهیه شده است.
            </span>

            <a
              href="/articles/feed.xml"
              className="text-primary hover:underline"
            >
              خوراک RSS مقالات
            </a>
          </div>
        </header>

        <div className="mt-6 flex justify-center">
          <Link
            href="/articles"
            className="text-sm font-semibold text-primary"
          >
            ← بازگشت به همه مقالات
          </Link>
        </div>
      </article>
    </div>
  );
}
