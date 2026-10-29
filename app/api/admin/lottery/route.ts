
import { NextRequest, NextResponse } from "next/server";

import { isAdmin } from "@/lib/auth";
import { getContent } from "@/lib/content";
import { saveArticleLotterySettings } from "@/lib/supabase-lottery";
import { validOrigin } from "@/lib/guard";
import { getPublishedArticles } from "@/lib/supabase-articles";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 1000;
const MAX_BATCHES = 100;

type LotteryUpdate = {
  enabled?: unknown;
  title?: unknown;
  description?: unknown;
  articleSlug?: unknown;
  period?: unknown;
};

type LotteryEntry = {
  id: string;
  userId: string;
  name: string;
  email: string;
  code: string;
  period: string;
  createdAt: string;
  selectable?: boolean;
};

type LotteryEntryRow = {
  id: string;
  user_id: string;
  name: string;
  email: string;
  code: string;
  period: string;
  created_at: string;
};

type LotteryWinnerRow = {
  period: string;
  entry_id: string;
  selected_at: string;
};

type LotteryWinner = LotteryEntry & {
  selectedAt: string;
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function cleanText(value: unknown, max: number) {
  return typeof value === "string"
    ? value.trim().slice(0, max)
    : "";
}

async function getSavedEntries(): Promise<LotteryEntry[]> {
  const supabase = getSupabaseAdmin();
  const entries: LotteryEntry[] = [];

  for (let batch = 0; batch < MAX_BATCHES; batch++) {
    const from = batch * PAGE_SIZE;

    const { data, error } = await supabase
      .from("article_lottery_entries")
      .select(
        "id,user_id,name,email,code,period,created_at"
      )
      .order("created_at", {
        ascending: false,
      })
      .order("id", {
        ascending: false,
      })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error(
        "Article lottery entries query failed:",
        error
      );

      throw new Error(
        "دریافت شرکت‌کنندگان از Supabase ناموفق بود."
      );
    }

    const rows = (data ?? []) as LotteryEntryRow[];

    entries.push(
      ...rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        name: row.name,
        email: row.email,
        code: row.code,
        period: row.period,
        createdAt: row.created_at,
        selectable: true,
      }))
    );

    if (rows.length < PAGE_SIZE) {
      return entries;
    }
  }

  throw new Error(
    "تعداد سوابق زیاد است و نیاز به صفحه‌بندی پنل دارد."
  );
}

function mergeEntries(
  legacy: LotteryEntry[],
  saved: LotteryEntry[]
): LotteryEntry[] {
  const byCode = new Map<string, LotteryEntry>();
  const byUserPeriod = new Set<string>();

  // Supabase is the authoritative source for new entries.
  for (const entry of saved) {
    byCode.set(entry.code, entry);

    byUserPeriod.add(
      JSON.stringify([entry.userId, entry.period])
    );
  }

  // Keep old entries visible until migration is verified.
  for (const entry of legacy) {
    const key = JSON.stringify([
      entry.userId,
      entry.period,
    ]);

    if (
      byCode.has(entry.code) ||
      byUserPeriod.has(key)
    ) {
      continue;
    }

    byCode.set(entry.code, { ...entry, selectable: false });
    byUserPeriod.add(key);
  }

  return [...byCode.values()].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
}

async function getSavedWinners(
  entries: LotteryEntry[]
): Promise<LotteryWinner[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("article_lottery_winners")
    .select("period,entry_id,selected_at")
    .order("selected_at", { ascending: false });

  if (error) {
    console.error("Article lottery winners query failed:", error);
    throw new Error("دریافت برندگان قرعه‌کشی ناموفق بود.");
  }

  const entryById = new Map<string, LotteryEntry>(
    entries
      .filter((entry) => entry.selectable)
      .map((entry): [string, LotteryEntry] => [entry.id, entry])
  );

  return ((data ?? []) as LotteryWinnerRow[]).flatMap((row) => {
    const entry = entryById.get(row.entry_id);
    if (!entry || entry.period !== row.period) return [];
    return [{ ...entry, selectedAt: row.selected_at }];
  });
}

/**
 * Admin-only lottery settings, participants, and manually selected winners.
 */
export async function GET() {
  if (!(await isAdmin())) {
    return json(
      { error: "دسترسی غیرمجاز است." },
      401
    );
  }

  try {
    const [content, publishedArticles, savedEntries] =
      await Promise.all([
        getContent(),
        getPublishedArticles(),
        getSavedEntries(),
      ]);

    const oldEntries = Array.isArray(
      content.articleLottery.entries
    )
      ? content.articleLottery.entries
      : [];

    const entries = mergeEntries(
      oldEntries,
      savedEntries
    );
    const winners = await getSavedWinners(entries);

    return json({
      lottery: {
        ...content.articleLottery,
        entries,
        winners,
      },

      articles: publishedArticles.map((article) => ({
        slug: article.slug,
        title: article.title,
      })),
    });
  } catch (error) {
    console.error("Admin lottery GET failed:", error);

    return json(
      {
        error:
          "دریافت تنظیمات یا شرکت‌کنندگان قرعه‌کشی ناموفق بود.",
      },
      503
    );
  }
}

/**
 * Select or replace the manually chosen winner for a period.
 * Only entries persisted in Supabase can be selected.
 */
export async function POST(request: NextRequest) {
  if (!validOrigin(request) || !(await isAdmin())) {
    return json({ error: "دسترسی غیرمجاز است." }, 403);
  }

  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return json({ error: "اطلاعات نامعتبر است." }, 400);
  }

  const payload = body as { entryId?: unknown; period?: unknown };
  const entryId = cleanText(payload.entryId, 80);
  const period = cleanText(payload.period, 100);

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(entryId)) {
    return json({ error: "شناسه شرکت‌کننده معتبر نیست." }, 400);
  }
  if (!period) {
    return json({ error: "دوره قرعه‌کشی مشخص نشده است." }, 400);
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: entry, error: entryError } = await supabase
      .from("article_lottery_entries")
      .select("id,period")
      .eq("id", entryId)
      .maybeSingle();

    if (entryError) {
      console.error("Lottery winner participant lookup failed:", entryError);
      throw new Error("بررسی شرکت‌کننده ناموفق بود.");
    }
    if (!entry || entry.period !== period) {
      return json({ error: "شرکت‌کننده‌ای با این کد و دوره پیدا نشد." }, 404);
    }

    const { error: winnerError } = await supabase
      .from("article_lottery_winners")
      .upsert(
        { period, entry_id: entryId, selected_at: new Date().toISOString() },
        { onConflict: "period" }
      );

    if (winnerError) {
      console.error("Lottery winner save failed:", winnerError);
      throw new Error("ثبت برنده ناموفق بود.");
    }

    return json({ ok: true, period, entryId });
  } catch (error) {
    console.error("Admin lottery winner POST failed:", error);
    return json({ error: "ثبت برنده قرعه‌کشی ناموفق بود." }, 503);
  }
}

/**
 * Update lottery settings without deleting entries.
 */
export async function PUT(request: NextRequest) {
  if (
    !validOrigin(request) ||
    !(await isAdmin())
  ) {
    return json(
      { error: "دسترسی غیرمجاز است." },
      403
    );
  }

  const body: unknown = await request
    .json()
    .catch(() => null);

  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    return json(
      { error: "اطلاعات نامعتبر است." },
      400
    );
  }

  const payload = body as LotteryUpdate;

  if (typeof payload.enabled !== "boolean") {
    return json(
      { error: "وضعیت قرعه‌کشی معتبر نیست." },
      400
    );
  }

  for (const field of [
    "title",
    "description",
    "articleSlug",
    "period",
  ] as const) {
    if (typeof payload[field] !== "string") {
      return json(
        { error: `مقدار ${field} معتبر نیست.` },
        400
      );
    }
  }

  const title = cleanText(payload.title, 120);
  const description = cleanText(
    payload.description,
    800
  );
  const articleSlug = cleanText(
    payload.articleSlug,
    150
  );
  const period = cleanText(payload.period, 100);

  if (!title) {
    return json(
      { error: "عنوان قرعه‌کشی الزامی است." },
      400
    );
  }

  if (!period) {
    return json(
      { error: "نام دوره الزامی است." },
      400
    );
  }

  if (
    articleSlug &&
    !/^[a-z0-9-]+$/.test(articleSlug)
  ) {
    return json(
      { error: "شناسه مقاله معتبر نیست." },
      400
    );
  }

  if (payload.enabled && !articleSlug) {
    return json(
      {
        error:
          "برای فعال‌کردن قرعه‌کشی باید مقاله انتخاب شود.",
      },
      400
    );
  }

  try {
    const publishedArticles =
      await getPublishedArticles();

    if (
      articleSlug &&
      !publishedArticles.some(
        (article) => article.slug === articleSlug
      )
    ) {
      return json(
        {
          error:
            "مقاله انتخاب‌شده منتشر نشده یا وجود ندارد.",
        },
        400
      );
    }

    await saveArticleLotterySettings({
      enabled: payload.enabled === true,
      title,
      description,
      articleSlug,
      period,
    });

    return json({ ok: true });
  } catch (error) {
    console.error("Admin lottery PUT failed:", error);

    return json(
      {
        error:
          "ذخیره تنظیمات قرعه‌کشی ناموفق بود.",
      },
      503
    );
  }
}
