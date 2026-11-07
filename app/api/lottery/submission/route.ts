
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, isDemoUser } from "@/lib/user-auth";
import { getContent } from "@/lib/content";
import { getSupabaseAdmin, withDatabaseTransaction } from "@/lib/supabase-admin";
import { validOrigin } from "@/lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_IMAGES = 5;
const MAX_IMAGE_SIZE = 1024 * 1024;
const MAX_TOTAL_SIZE = 5 * 1024 * 1024;

function databaseMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "code" in error && error.code === "42P01") {
    return "جدول ارسال تصاویر در دیتابیس متصل به سایت وجود ندارد. مدیر باید اتصال DATABASE_URL محیط Production را بررسی و SQL نصب را روی همان دیتابیس اجرا کند.";
  }
  return fallback;
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) return json({ error: "ابتدا وارد حساب شوید." }, 401);

    const content = await getContent();
    const period = content.articleLottery.period;

    const { data, error } = await getSupabaseAdmin()
      .from("article_lottery_submissions")
      .select("id,status,issued_code,admin_note,created_at,reviewed_at")
      .eq("user_id", user.id)
      .eq("period", period)
      .maybeSingle();

    if (error) throw error;

    return json({ submission: data, period });
  } catch (error) {
    console.error("Lottery submission GET:", error);
    return json({ error: databaseMessage(error, "دریافت وضعیت درخواست ناموفق بود.") }, 503);
  }
}

export async function POST(request: NextRequest) {
  if (!validOrigin(request)) {
    return json({ error: "درخواست نامعتبر است." }, 403);
  }

  try {
    const user = await getCurrentUser();

    if (!user) return json({ error: "ابتدا وارد حساب شوید." }, 401);

    if (isDemoUser(user)) {
      return json({ error: "حساب نمایشی اجازه ارسال درخواست ندارد." }, 403);
    }

    const body = await request.json();

    if (!Array.isArray(body.images) ||
        body.images.length < 1 ||
        body.images.length > MAX_IMAGES) {
      return json({ error: "باید بین ۱ تا ۵ تصویر ارسال کنید." }, 400);
    }

    let totalSize = 0;
    const images = body.images.map((image: unknown) => {
      if (typeof image !== "string") throw new Error("فرمت تصویر نامعتبر است.");
      const match = image.match(
        /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/
      );
      if (!match) throw new Error("فقط JPG، PNG و WEBP مجاز هستند.");
      const buffer = Buffer.from(match[2], "base64");
      if (!buffer.length || buffer.length > MAX_IMAGE_SIZE) {
        throw new Error("حجم هر تصویر باید حداکثر ۱ مگابایت باشد.");
      }
      totalSize += buffer.length;
      if (totalSize > MAX_TOTAL_SIZE) {
        throw new Error("حجم مجموع تصاویر بیش از حد مجاز است.");
      }
      return image;
    });

    const result = await withDatabaseTransaction(async (client) => {
      // Lock the settings row so a concurrent period deletion cannot leave orphan submissions.
      const settingsResult = await client.query(
        "SELECT enabled, period FROM public.article_lottery_settings WHERE id = 1 FOR UPDATE"
      );
      const lottery = settingsResult.rows[0] as
        | { enabled: boolean; period: string }
        | undefined;

      if (!lottery?.enabled || !lottery.period?.trim()) {
        return { kind: "disabled" as const };
      }

      const inserted = await client.query(
        `INSERT INTO public.article_lottery_submissions
           (user_id, name, email, period, images, status)
         VALUES ($1, $2, $3, $4, $5::jsonb, 'pending')
         RETURNING id, status, created_at`,
        [
          user.id,
          user.name?.trim() || user.email.split("@")[0] || "کاربر پراپ‌بین",
          user.email,
          lottery.period,
          JSON.stringify(images),
        ]
      );

      return { kind: "created" as const, submission: inserted.rows[0], period: lottery.period };
    });

    if (result.kind === "disabled") {
      return json({ error: "قرعه‌کشی فعال نیست یا دوره‌ای برای آن تعریف نشده است." }, 403);
    }

    return json({ ok: true, submission: result.submission, period: result.period });

  } catch (error) {
    console.error("Lottery submission POST:", error);
    if (error && typeof error === "object" && "code" in error && error.code === "23505") {
      return json({ error: "برای این دوره قبلاً درخواست ثبت کرده‌اید." }, 409);
    }
    return json({
      error: databaseMessage(error, error instanceof Error
        ? error.message
        : "ثبت درخواست ناموفق بود."),
    }, error && typeof error === "object" && "code" in error && error.code === "42P01" ? 503 : 400);
  }
}
