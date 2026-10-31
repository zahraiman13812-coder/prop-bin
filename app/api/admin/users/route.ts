import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { listUsers } from "@/lib/user-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  try {
    // Read users independently of site content, settings and article lottery.
    const users = await listUsers();
    const db = getSupabaseAdmin();
    const [pollsResult, spinsResult] = await Promise.all([
      db.from("site_polls").select("user_id,created_at"),
      db.from("wheel_spins").select("user_id,created_at"),
    ]);
    // A statistics query should never prevent admins from seeing registered users.
    if (pollsResult.error) console.error("Admin user poll statistics failed:", pollsResult.error);
    if (spinsResult.error) console.error("Admin user spin statistics failed:", spinsResult.error);

    const stats = new Map<string, { reviews: number; spins: number; lastReviewAt: string | null; lastSpinAt: string | null }>();
    const ensure = (id: string) => {
      if (!stats.has(id)) stats.set(id, { reviews: 0, spins: 0, lastReviewAt: null, lastSpinAt: null });
      return stats.get(id)!;
    };
    for (const poll of (pollsResult.data ?? []) as { user_id: string; created_at: string | null }[]) {
      if (!poll.user_id) continue;
      const row = ensure(poll.user_id);
      row.reviews++;
      if (poll.created_at && (!row.lastReviewAt || poll.created_at > row.lastReviewAt)) row.lastReviewAt = poll.created_at;
    }
    for (const spin of (spinsResult.data ?? []) as { user_id: string; created_at: string | null }[]) {
      if (!spin.user_id) continue;
      const row = ensure(spin.user_id);
      row.spins++;
      if (spin.created_at && (!row.lastSpinAt || spin.created_at > row.lastSpinAt)) row.lastSpinAt = spin.created_at;
    }

    return NextResponse.json({
      users: users.map(user => ({
        ...user,
        ...(stats.get(user.id) ?? { reviews: 0, spins: 0, lastReviewAt: null, lastSpinAt: null }),
      })),
      total: users.length,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Admin users GET failed:", error);
    return NextResponse.json({ error: "دریافت کاربران از پایگاه داده ناموفق بود. تنظیمات DATABASE_URL و جدول site_users را بررسی کنید." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
