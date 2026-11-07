import { NextRequest, NextResponse } from "next/server";
import { getContent } from "@/lib/content";
import { getCurrentUser } from "@/lib/user-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

async function findWinner(period: string) {
  const db = getSupabaseAdmin();
  const { data: winner, error: wError } = await db.from("article_lottery_winners")
    .select("period,entry_id,selected_at").eq("period", period).maybeSingle();
  if (wError) throw new Error(wError.message);
  if (!winner) return null;
  const { data: entry, error: eError } = await db.from("article_lottery_entries")
    .select("name,period").eq("id", winner.entry_id).maybeSingle();
  if (eError) throw new Error(eError.message);
  if (!entry || entry.period !== period) return null;
  return { name: entry.name, period, selectedAt: winner.selected_at };
}

export async function GET() {
  try {
    const [content, user] = await Promise.all([getContent(), getCurrentUser()]);
    const lottery = content.articleLottery;
    let entry: { code: string; createdAt: string } | null = null;
    if (user) {
      const { data, error } = await getSupabaseAdmin().from("article_lottery_entries")
        .select("code,created_at").eq("user_id", user.id).eq("period", lottery.period).maybeSingle();
      if (error) throw new Error(error.message);
      if (data) entry = { code: data.code, createdAt: data.created_at };
      else {
        const legacy = Array.isArray(lottery.entries)
          ? lottery.entries.find(x => x.userId === user.id && x.period === lottery.period)
          : null;
        if (legacy) entry = { code: legacy.code, createdAt: legacy.createdAt };
      }
    }
    const winner = await findWinner(lottery.period);
    return json({ enabled: lottery.enabled, title: lottery.title,
      description: lottery.description, articleSlug: lottery.articleSlug,
      period: lottery.period, signedIn: !!user, entry, winner });
  } catch (error) {
    console.error("Lottery GET failed:", error);
    return json({ error: "دریافت اطلاعات قرعه‌کشی ناموفق بود." }, 503);
  }
}

// New entries require submission of evidence and explicit admin approval.
// Keep GET unchanged in behavior so previously issued participation codes remain visible.
export async function POST(_request: NextRequest) {
  return json({ error: "صدور خودکار کد غیرفعال است. ابتدا تصاویر را ارسال کنید تا مدیر بررسی کند." }, 410);
}
