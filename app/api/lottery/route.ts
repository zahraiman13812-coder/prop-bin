
import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { getContent } from "@/lib/content";
import {
  getCurrentUser,
  isDemoUser,
  normalizeEmail,
} from "@/lib/user-auth";
import type { User } from "@/lib/user-auth";
import { validOrigin } from "@/lib/guard";
import { getPublishedArticle } from "@/lib/supabase-articles";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOCAL_TEST_EMAIL = "demo@parabin.test";

type LotteryEntryRow = {
  code: string;
  created_at: string;
};

type PublicWinner = {
  name: string;
  period: string;
  selectedAt: string;
};

async function findWinner(period: string): Promise<PublicWinner | null> {
  const supabase = getSupabaseAdmin();
  const { data: winner, error: winnerError } = await supabase
    .from("article_lottery_winners")
    .select("period,entry_id,selected_at")
    .eq("period", period)
    .maybeSingle();

  if (winnerError) {
    console.error("Lottery winner lookup failed:", winnerError);
    throw new Error("خطا در دریافت برنده قرعه‌کشی");
  }
  if (!winner) return null;

  const { data: entry, error: entryError } = await supabase
    .from("article_lottery_entries")
    .select("name,period")
    .eq("id", winner.entry_id)
    .maybeSingle();

  if (entryError) {
    console.error("Lottery winner entry lookup failed:", entryError);
    throw new Error("خطا در دریافت اطلاعات برنده");
  }
  if (!entry || entry.period !== period) return null;

  return {
    name: entry.name,
    period: winner.period,
    selectedAt: winner.selected_at,
  };
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

async function findEntry(
  userId: string,
  period: string
): Promise<LotteryEntryRow | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("article_lottery_entries")
    .select("code,created_at")
    .eq("user_id", userId)
    .eq("period", period)
    .maybeSingle();

  if (error) {
    console.error("Lottery lookup failed:", error);
    throw new Error("خطا در دریافت کد قرعه‌کشی");
  }

  return data as LotteryEntryRow | null;
}

function publicEntry(entry: LotteryEntryRow) {
  return {
    code: entry.code,
    createdAt: entry.created_at,
  };
}

function isTestAccount(user: User) {
  return (
    isDemoUser(user) ||
    normalizeEmail(user.email) === LOCAL_TEST_EMAIL
  );
}

export async function GET() {
  try {
    const [content, user] = await Promise.all([
      getContent(),
      getCurrentUser(),
    ]);

    const lottery = content.articleLottery;

    let entry: {
      code: string;
      createdAt: string;
    } | null = null;

    if (user) {
      const saved = await findEntry(
        user.id,
        lottery.period
      );

      if (saved) {
        entry = publicEntry(saved);
      } else {
        const legacy = lottery.entries.find(
          (item) =>
            item.userId === user.id &&
            item.period === lottery.period
        );

        if (legacy) {
          entry = {
            code: legacy.code,
            createdAt: legacy.createdAt,
          };
        }
      }
    }

    const winner = await findWinner(lottery.period);

    return json({
      enabled: lottery.enabled,
      title: lottery.title,
      description: lottery.description,
      articleSlug: lottery.articleSlug,
      period: lottery.period,
      signedIn: Boolean(user),
      entry,
      winner,
    });
  } catch (error) {
    console.error("Lottery GET failed:", error);

    return json(
      {
        error: "دریافت اطلاعات قرعه‌کشی ناموفق بود.",
      },
      503
    );
  }
}

export async function POST(request: NextRequest) {
  if (!validOrigin(request)) {
    return json(
      { error: "مبدأ درخواست معتبر نیست." },
      403
    );
  }

  try {
    const user = await getCurrentUser();

    if (!user) {
      return json(
        {
          error: "ابتدا وارد حساب شوید.",
          login: "/login?next=%2Flottery",
        },
        401
      );
    }

    if (isTestAccount(user)) {
      return json(
        {
          error:
            "حساب آزمایشی اجازه شرکت در قرعه‌کشی واقعی را ندارد.",
        },
        403
      );
    }

    if (
      typeof user.id !== "string" ||
      !user.id.trim() ||
      user.id.length > 200
    ) {
      return json(
        {
          error: "شناسه کاربر معتبر نیست.",
        },
        401
      );
    }

    const content = await getContent();
    const lottery = content.articleLottery;

    if (
      !lottery.enabled ||
      !lottery.articleSlug ||
      !lottery.period.trim()
    ) {
      return json(
        {
          error:
            "قرعه‌کشی در حال حاضر فعال نیست.",
        },
        403
      );
    }

    const article = await getPublishedArticle(
      lottery.articleSlug
    );

    if (!article) {
      return json(
        {
          error:
            "مقاله قرعه‌کشی منتشر نشده یا در دسترس نیست.",
        },
        409
      );
    }

    const latestContent = await getContent();
    const latest = latestContent.articleLottery;

    if (
      !latest.enabled ||
      latest.articleSlug !== lottery.articleSlug ||
      latest.period !== lottery.period
    ) {
      return json(
        {
          error:
            "تنظیمات قرعه‌کشی تغییر کرده است. صفحه را تازه‌سازی کنید.",
        },
        409
      );
    }

    const existing = await findEntry(
      user.id,
      latest.period
    );

    if (existing) {
      return json({
        ok: true,
        ...publicEntry(existing),
        existing: true,
      });
    }

    // Legacy compatibility: existing local codes
    // must never be replaced by new codes.
    const legacy = latest.entries.find(
      (item) =>
        item.userId === user.id &&
        item.period === latest.period
    );

    if (legacy) {
      return json({
        ok: true,
        code: legacy.code,
        createdAt: legacy.createdAt,
        existing: true,
      });
    }

    const supabase = getSupabaseAdmin();

    for (let attempt = 0; attempt < 3; attempt++) {
      const code =
        "PB-" +
        randomBytes(12)
          .toString("hex")
          .toUpperCase();

      const { data, error } = await supabase
        .from("article_lottery_entries")
        .insert({
          user_id: user.id,
          name: user.name,
          email: user.email,
          period: latest.period,
          code,
        })
        .select("code,created_at")
        .single();

      if (!error && data) {
        return json({
          ok: true,
          code: data.code,
          createdAt: data.created_at,
          existing: false,
        });
      }

      if (error?.code === "23505") {
        // Simultaneous submissions for the same
        // user and period return the saved entry.
        const saved = await findEntry(
          user.id,
          latest.period
        );

        if (saved) {
          return json({
            ok: true,
            ...publicEntry(saved),
            existing: true,
          });
        }

        // Otherwise retry a possible code collision.
        continue;
      }

      console.error("Lottery insert failed:", error);

      return json(
        {
          error: "ثبت کد قرعه‌کشی ناموفق بود.",
        },
        503
      );
    }

    return json(
      {
        error:
          "صدور کد انجام نشد. دوباره تلاش کنید.",
      },
      503
    );
  } catch (error) {
    console.error("Lottery POST failed:", error);

    return json(
      {
        error:
          "صدور کد قرعه‌کشی موقتاً امکان‌پذیر نیست.",
      },
      503
    );
  }
}
