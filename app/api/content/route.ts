
import {
  NextRequest,
  NextResponse,
} from "next/server";

import { revalidatePath } from "next/cache";

import {
  getContent,
  updateContent,
  type Content,
  type Poll,
} from "@/lib/content";

import { isAdmin } from "@/lib/auth";
import { validOrigin } from "@/lib/guard";
import { isSafeSiteImage } from "@/lib/site-ui";
import { isValidArticleImage } from "@/lib/article-image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function error(message: string, status = 400) {
  return NextResponse.json(
    { error: message },
    { status }
  );
}

function safeString(
  value: unknown,
  max = 3000
) {
  return typeof value === "string"
    ? value.trim().slice(0, max)
    : "";
}

/*
 * These appearance-only settings are managed by
 * /api/admin/appearance.
 *
 * Excluding them prevents normal settings updates
 * from overwriting the navigation or home page layout.
 */
const SETTINGS_FIELDS = [
  "name",
  "tagline",
  "heroEyebrow",
  "heroTitle",
  "heroHighlight",
  "heroDescription",
  "firmsTitle",
  "firmsDescription",
  "compareTitle",
  "compareDescription",
  "articlesTitle",
  "articlesDescription",
  "reviewsTitle",
  "footerDescription",
  "contactEmail",
  "instagram",
  "telegram",
  "primaryDark",
  "primaryLight",
] as const;

function socialHandle(value: unknown) {
  let handle = safeString(value, 180).replace(
    /^@+/,
    ""
  );

  if (/^https?:\/\//i.test(handle)) {
    try {
      const url = new URL(handle);

      handle =
        url.pathname
          .split("/")
          .filter(Boolean)[0] || "";
    } catch {
      return "";
    }
  }

  return handle
    .replace(/[^A-Za-z0-9._-]/g, "")
    .slice(0, 60);
}

function normalize(
  type: string,
  data: Record<string, unknown>
) {
  if (type === "firms") {
    const keys = [
      "id",
      "name",
      "rating",
      "capital",
      "profit",
      "fee",
      "discount",
      "code",
      "color",
      "description",
      "payout",
      "challenge",
      "logo",
      "logoText",
    ];

    const result: Record<string, string> = {};

    for (const key of keys) {
      result[key] = safeString(
        data[key],
        key === "description" ? 3000 : 150
      );
    }

    if (
      !result.id ||
      !result.name ||
      !/^[a-z0-9-]+$/.test(result.id)
    ) {
      throw new Error(
        "نام و شناسه انگلیسی شرکت الزامی است."
      );
    }

    if (
      !/^#[0-9a-fA-F]{6}$/.test(result.color)
    ) {
      result.color = "#008cff";
    }

    if (
      result.logo &&
      !isSafeSiteImage(result.logo)
    ) {
      throw new Error(
        "مسیر لوگوی شرکت معتبر نیست."
      );
    }

    result.logoText =
      result.logoText.slice(0, 12);

    return result;
  }

  if (type === "articles") {
    const keys = [
      "slug",
      "category",
      "date",
      "title",
      "excerpt",
      "read",
      "icon",
      "image",
      "body",
      "seoTitle",
      "seoDescription",
      "keywords",
      "author",
      "publishedAt",
      "updatedAt",
    ];

    const limits: Record<string, number> = {
      body: 30000,
      seoTitle: 120,
      seoDescription: 300,
      keywords: 300,
      author: 80,
      publishedAt: 40,
      updatedAt: 40,
    };

    const result: Record<string, string> = {};

    for (const key of keys) {
      result[key] = safeString(
        data[key],
        limits[key] ?? 3000
      );
    }

    if (
      !result.title ||
      !result.slug ||
      !/^[a-z0-9-]+$/.test(result.slug)
    ) {
      throw new Error(
        "عنوان و شناسه انگلیسی مقاله الزامی است."
      );
    }

    if (
      result.image &&
      !isValidArticleImage(result.image)
    ) {
      throw new Error(
        "مسیر تصویر مقاله معتبر نیست."
      );
    }

    for (const key of [
      "publishedAt",
      "updatedAt",
    ]) {
      if (
        result[key] &&
        Number.isNaN(
          new Date(result[key]).getTime()
        )
      ) {
        throw new Error(
          "تاریخ انتشار یا به‌روزرسانی معتبر نیست."
        );
      }
    }

    return result;
  }

  if (type === "settings") {
    const result: Record<string, string> = {};

    for (const key of SETTINGS_FIELDS) {
      // Preserve fields not provided in partial updates.
      if (!(key in data)) continue;

      result[key] =
        key === "instagram" ||
        key === "telegram"
          ? socialHandle(data[key])
          : safeString(data[key], 1500);
    }

    for (const key of [
      "primaryDark",
      "primaryLight",
    ]) {
      if (
        key in result &&
        !/^#[0-9a-fA-F]{6}$/.test(result[key])
      ) {
        throw new Error(
          "کد رنگ معتبر نیست."
        );
      }
    }

    if (
      result.contactEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        result.contactEmail
      )
    ) {
      throw new Error(
        "ایمیل ارتباطی معتبر نیست."
      );
    }

    return result;
  }

  throw new Error("بخش نامعتبر است.");
}

function refreshPages() {
  for (const route of [
    "/",
    "/firms",
    "/compare",
    "/discounts",
    "/articles",
    "/polls",
  ]) {
    revalidatePath(route);
  }
}

function publicPoll(poll: Poll) {
  return {
    id: poll.id,
    firmId: poll.firmId,
    trust: poll.trust,
    support: poll.support,
    payout: poll.payout,
    rules: poll.rules,
    comment: poll.comment,
    approved: poll.approved,
    featured: poll.featured,
    createdAt: poll.createdAt,
    displayName:
      poll.displayName || "کاربر پراپ بین",
  };
}

/**
 * Read public content.
 * Wheel/raffle data is intentionally absent.
 */
export async function GET() {
  const content = await getContent();

  if (await isAdmin()) {
    return NextResponse.json(content, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }

  return NextResponse.json(
    {
      firms: content.firms,
      articles: content.articles,
      settings: content.settings,
      polls: content.polls
        .filter((poll) => poll.approved)
        .map(publicPoll),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function PUT(
  request: NextRequest
) {
  if (
    !validOrigin(request) ||
    !(await isAdmin())
  ) {
    return error(
      "دسترسی غیرمجاز.",
      403
    );
  }

  const payload = (await request
    .json()
    .catch(() => null)) as {
      type?: string;
      item?: Record<string, unknown>;
      originalId?: string;
    } | null;

  if (
    !payload?.type ||
    !payload.item
  ) {
    return error(
      "اطلاعات ناقص است."
    );
  }

  try {
    const type = payload.type;

    const normalized = normalize(
      type,
      payload.item
    );

    await updateContent((content) => {
      if (type === "settings") {
        content.settings = {
          ...content.settings,
          ...(normalized as Partial<
            Content["settings"]
          >),
        };

        return;
      }

      if (
        type !== "firms" &&
        type !== "articles"
      ) {
        throw new Error(
          "بخش نامعتبر است."
        );
      }

      const key =
        type === "firms"
          ? "id"
          : "slug";

      const records =
        content[type] as unknown as Record<
          string,
          string
        >[];

      const requestedId = safeString(
        payload.originalId
      );

      const previousId =
        requestedId || normalized[key];

      // Prevent duplicate IDs and slugs.
      const duplicate = records.some(
        (record) =>
          record[key] === normalized[key] &&
          (!requestedId ||
            record[key] !== requestedId)
      );

      if (duplicate) {
        throw new Error(
          "این شناسه قبلاً ثبت شده است."
        );
      }

      const index = requestedId
        ? records.findIndex(
            (record) =>
              record[key] === requestedId
          )
        : -1;

      if (index >= 0) {
        records[index] = normalized;
      } else {
        records.unshift(normalized);
      }

      // Keep reviews connected to renamed firms.
      if (
        type === "firms" &&
        previousId !== normalized.id
      ) {
        content.polls.forEach(
          (poll) => {
            if (
              poll.firmId === previousId
            ) {
              poll.firmId =
                normalized.id;
            }
          }
        );
      }
    });

    refreshPages();

    return NextResponse.json({
      ok: true,
    });
  } catch (err) {
    return error(
      err instanceof Error
        ? err.message
        : "ذخیره انجام نشد."
    );
  }
}

export async function DELETE(
  request: NextRequest
) {
  if (
    !validOrigin(request) ||
    !(await isAdmin())
  ) {
    return error(
      "دسترسی غیرمجاز.",
      403
    );
  }

  const payload = (await request
    .json()
    .catch(() => null)) as {
      type?: string;
      id?: string;
    } | null;

  if (
    !payload?.id ||
    ![
      "firms",
      "articles",
      "polls",
    ].includes(payload.type || "")
  ) {
    return error(
      "درخواست نامعتبر است."
    );
  }

  await updateContent((content) => {
    if (payload.type === "firms") {
      content.firms =
        content.firms.filter(
          (firm) =>
            firm.id !== payload.id
        );

      // Remove reviews of the deleted firm.
      content.polls =
        content.polls.filter(
          (poll) =>
            poll.firmId !== payload.id
        );
    }

    if (payload.type === "articles") {
      content.articles =
        content.articles.filter(
          (article) =>
            article.slug !== payload.id
        );
    }

    if (payload.type === "polls") {
      content.polls =
        content.polls.filter(
          (poll) =>
            poll.id !== payload.id
        );
    }
  });

  refreshPages();

  return NextResponse.json({
    ok: true,
  });
}
