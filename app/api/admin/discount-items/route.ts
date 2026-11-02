import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const respond = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
async function authorized(request?: Request) {
  if (!(await isAdmin())) return false;
  if (!request) return true;
  const origin = request.headers.get("origin");
  return !!origin && new URL(origin).origin === new URL(request.url).origin;
}
export async function GET() {
  try {
    if (!(await authorized())) return respond({ error: "دسترسی غیرمجاز" }, 401);
    const db = getSupabaseAdmin();
    const [firms, discounts] = await Promise.all([
      db.from("prop_firms").select("id,name,discount_intro,logo,logo_text").order("name"),
      db.from("firm_discounts").select("id,firm_id,code,amount,description,sort_order").order("sort_order"),
    ]);
    if (firms.error || discounts.error) throw Error("Database query failed");
    return respond({ firms: firms.data, discounts: discounts.data });
  } catch (e) {
    console.error("discount admin GET", e);
    return respond({ error: "خطا در دریافت اطلاعات؛ Migration دیتابیس را بررسی کنید." }, 500);
  }
}
export async function POST(request: Request) {
  try {
    if (!(await authorized(request))) return respond({ error: "دسترسی غیرمجاز یا مبدأ نامعتبر" }, 403);
    const raw = await request.text();
    if (raw.length > 6000) return respond({ error: "حجم زیاد است" }, 413);
    const b = JSON.parse(raw);
    const firmId = String(b.firmId || "");
    if (!/^[a-f0-9-]{36}$/i.test(firmId)) return respond({ error: "شناسه شرکت نامعتبر است" }, 400);
    if (b.action === "intro") {
      if (typeof b.intro !== "string" || b.intro.length > 1000) return respond({ error: "توضیحات باید حداکثر ۱۰۰۰ کاراکتر باشد" }, 400);
      const r = await getSupabaseAdmin().from("prop_firms").update({ discount_intro: b.intro.trim() }).eq("id", firmId).select("id").maybeSingle();
      if (r.error || !r.data) return respond({ error: "ذخیره توضیحات انجام نشد" }, 500);
      return respond({ success: true });
    }
    if (typeof b.code !== "string" || typeof b.amount !== "string" || typeof b.description !== "string") return respond({ error: "اطلاعات نامعتبر است" }, 400);
    const code = b.code.trim(), amount = b.amount.trim(), description = b.description.trim();
    if (!code || !amount || code.length > 100 || amount.length > 100 || description.length > 1000) return respond({ error: "مقادیر کد، درصد یا توضیحات نامعتبر است" }, 400);
    const row = { firm_id: firmId, code, amount, description };
    // Each offer is identified by its UUID, never by the coupon text.
    // Duplicate coupon text is valid for separate plans/conditions.
    const db = getSupabaseAdmin();
    const r = b.id
      ? await db.from("firm_discounts").update({ code, amount, description }).eq("id", b.id).eq("firm_id", firmId).select("id").maybeSingle()
      : await db.from("firm_discounts").insert(row).select("id").maybeSingle();
    if (r.error || !r.data) {
      console.error("discount offer save failed", r.error);
      return respond({ error: "ذخیره کد تخفیف ناموفق بود؛ محدودیت‌های دیتابیس را بررسی کنید" }, 500);
    }
    return respond({ success: true });
  } catch (e) {
    console.error("discount admin POST", e);
    return respond({ error: "خطا در ثبت اطلاعات" }, 500);
  }
}
export async function DELETE(request: Request) {
  try {
    if (!(await authorized(request))) return respond({ error: "دسترسی غیرمجاز" }, 403);
    const raw = await request.text();
    if (raw.length > 1000) return respond({ error: "درخواست نامعتبر" }, 400);
    const { id } = JSON.parse(raw);
    if (typeof id !== "string" || !/^[a-f0-9-]{36}$/i.test(id)) return respond({ error: "شناسه نامعتبر" }, 400);
    const r = await getSupabaseAdmin().from("firm_discounts").delete().eq("id", id).select("id").maybeSingle();
    if (r.error || !r.data) return respond({ error: "حذف انجام نشد" }, 500);
    return respond({ success: true });
  } catch (e) {
    console.error("discount delete", e);
    return respond({ error: "خطای حذف" }, 500);
  }
}
