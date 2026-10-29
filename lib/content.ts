
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { firms, articles } from "./data";
import { getPolls } from "./supabase-polls";
import { getArticleLotterySettings } from "./supabase-lottery";
import { getSiteSettings, saveSiteSettings } from "./supabase-site-settings";

export type Firm = (typeof firms)[number];

export type Article = (typeof articles)[number] & {
  body?: string;
  image?: string;
  seoTitle?: string;
  seoDescription?: string;
  keywords?: string;
  author?: string;
  publishedAt?: string;
  updatedAt?: string;
};

export type Poll = {
  id: string;
  firmId: string;
  trust: number;
  support: number;
  payout: number;
  rules: number;
  comment: string;
  approved: boolean;
  featured: boolean;
  createdAt: string;
  userId?: string;
  displayName?: string;
};

export type SiteSettings = {
  name: string;
  tagline: string;
  heroEyebrow: string;
  heroTitle: string;
  heroHighlight: string;
  heroDescription: string;
  firmsTitle: string;
  firmsDescription: string;
  compareTitle: string;
  compareDescription: string;
  articlesTitle: string;
  articlesDescription: string;
  reviewsTitle: string;
  footerDescription: string;
  contactEmail: string;
  instagram: string;
  telegram: string;
  primaryDark: string;
  primaryLight: string;

  logoUrl: string;
  heroImageUrl: string;
  navigationJson: string;
  homeSectionsJson: string;
};

export type ArticleLottery = {
  enabled: boolean;
  title: string;
  description: string;
  articleSlug: string;
  period: string;
  entries: {
    id: string;
    userId: string;
    name: string;
    email: string;
    code: string;
    period: string;
    createdAt: string;
  }[];
};

export const defaultArticleLottery: ArticleLottery = {
  enabled: false,
  title: "قرعه‌کشی ویژه مقالات",
  description:
    "مقاله را بخوانید و کد شرکت دریافت کنید.",
  articleSlug: "",
  period: "دوره اول",
  entries: [],
};

export type Content = {
  articleLottery: ArticleLottery;
  firms: Firm[];
  articles: Article[];
  polls: Poll[];
  settings: SiteSettings;
};

export const initialContent: Content = {
  firms,
  articles,
  polls: [],

  settings: {
    name: "پراپ بین",
    tagline:
      "مرجع بررسی و مقایسه شرکت‌های پراپ",

    heroEyebrow:
      "راهنمای هوشمند دنیای پراپ",
    heroTitle: "پراپ بین؛",
    heroHighlight: "انتخاب بهتر",

    heroDescription:
      "شرکت‌های پراپ را شفاف بررسی و کنار هم مقایسه کن؛ قوانین، هزینه‌ها و تخفیف‌ها را یک‌جا ببین.",

    firmsTitle: "شرکت‌های پراپ برتر",
    firmsDescription:
      "شرکت‌های محبوب و شرایط آن‌ها را بررسی کن.",

    compareTitle:
      "قبل از انتخاب، مقایسه کن.",
    compareDescription:
      "سهم سود، هزینه شروع و سقف سرمایه را کنار هم ببین.",

    articlesTitle: "آخرین مقالات",
    articlesDescription:
      "نکات کاربردی برای شناخت پراپ و مدیریت ریسک.",

    reviewsTitle:
      "تریدرها چه می‌گویند؟",

    footerDescription:
      "پراپ بین، مرجع بررسی و مقایسه شرکت‌های پراپ.",

    contactEmail: "",
    instagram: "",
    telegram: "",

    primaryDark: "#008cff",
    primaryLight: "#0078ed",

    logoUrl: "/pb-logo.png",
    heroImageUrl: "",

    navigationJson: JSON.stringify([
      {
        id: "home",
        label: "صفحه اصلی",
        href: "/",
        visible: true,
      },
      {
        id: "discounts",
        label: "کد تخفیف",
        href: "/discounts",
        visible: true,
      },
      {
        id: "firms",
        label: "بررسی پراپ",
        href: "/firms",
        visible: true,
      },
      {
        id: "compare",
        label: "مقایسه پراپ",
        href: "/compare",
        visible: true,
      },
      {
        id: "polls",
        label: "نظرسنجی پراپ",
        href: "/polls",
        visible: true,
      },
      {
        id: "articles",
        label: "مقالات پراپ",
        href: "/articles",
        visible: true,
      },
    ]),

    homeSectionsJson: JSON.stringify([
      "hero",
      "features",
      "firms",
      "compare",
      "articles",
      "reviews",
      "social",
    ]),
  },

  articleLottery: structuredClone(
    defaultArticleLottery
  ),
};

const FILE = path.join(
  process.cwd(),
  "data",
  "content.json"
);

let pending: Promise<unknown> =
  Promise.resolve();

export async function getContent(): Promise<Content> {
  const [polls, articleLottery, settings] = await Promise.all([
    getPolls(),
    getArticleLotterySettings(),
    getSiteSettings(initialContent.settings),
  ]);
  try {
    const raw = await fs.readFile(
      FILE,
      "utf8"
    );

    const data: unknown = JSON.parse(raw);

    if (
      !data ||
      typeof data !== "object" ||
      Array.isArray(data)
    ) {
      throw new Error(
        "ساختار اطلاعات سایت نامعتبر است."
      );
    }

    const stored = data as Partial<Content>;

    return {
      firms: Array.isArray(stored.firms)
        ? stored.firms
        : structuredClone(firms),

      articles: Array.isArray(stored.articles)
        ? stored.articles
        : structuredClone(articles),

      polls,

      // Site settings are authoritative in Supabase. The legacy
      // content.json settings object is deliberately not read anymore.
      settings,

      articleLottery,
    };
  } catch (error) {
    if (
      (error as NodeJS.ErrnoException)
        .code === "ENOENT"
    ) {
      return {
        ...structuredClone(initialContent),
        polls,
        articleLottery,
        settings,
      };
    }

    throw error;
  }
}

export async function updateContent<T>(
  callback: (
    content: Content
  ) => T | Promise<T>
): Promise<T> {
  const task = pending
    .catch(() => undefined)
    .then(async () => {
      const content = await getContent();
      const beforeSettings = JSON.stringify(content.settings);
      const beforeLocalContent = JSON.stringify({
        firms: content.firms,
        articles: content.articles,
      });

      const result = await callback(content);

      const settingsChanged =
        JSON.stringify(content.settings) !== beforeSettings;
      const localContentChanged =
        JSON.stringify({
          firms: content.firms,
          articles: content.articles,
        }) !== beforeLocalContent;

      // Settings updates are written to Supabase and are no longer stored
      // in content.json as the runtime source of truth.
      if (settingsChanged) {
        await saveSiteSettings(content.settings);
      }

      // This helper is still used by a few legacy admin operations for
      // articles/firms. Do not rewrite the JSON file for settings-only
      // changes; keep unrelated legacy data in the file intact.
      if (localContentChanged) {
        let stored: Record<string, unknown> = {};

        try {
          const raw = await fs.readFile(FILE, "utf8");
          const parsed: unknown = JSON.parse(raw);
          if (
            parsed &&
            typeof parsed === "object" &&
            !Array.isArray(parsed)
          ) {
            stored = parsed as Record<string, unknown>;
          }
        } catch (error) {
          if (
            (error as NodeJS.ErrnoException).code !== "ENOENT"
          ) {
            throw error;
          }
        }

        // Keep the legacy file limited to the content collections this
        // particular helper still owns. Supabase owns settings, polls,
        // and article-lottery settings.
        stored.firms = content.firms;
        stored.articles = content.articles;

        await fs.mkdir(path.dirname(FILE), { recursive: true });
        const temporary = `${FILE}.${randomUUID()}.tmp`;
        await fs.writeFile(
          temporary,
          JSON.stringify(stored, null, 2),
          { encoding: "utf8", mode: 0o600 }
        );
        await fs.rename(temporary, FILE);
      }

      return result;
    });

  pending = task;
  return task;
}
