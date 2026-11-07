
import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { validOrigin } from "@/lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET() {
  if (!(await isAdmin())) {
    return json({ error: "دسترسی غیرمجاز است." }, 401);
  }

  try {
    const { data, error } = await getSupabaseAdmin()
      .from("article_lottery_submissions")
      .select("id,user_id,name,email,period,images,status,issued_code,admin_note,created_at,reviewed_at")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw error;

    return json({ submissions: data || [] });
  } catch (error) {
    console.error("Admin lottery submissions GET:", error);
    return json({ error: error && typeof error === "object" && "code" in error && error.code === "42P01"
      ? "جدول ثبت تصاویر در دیتابیس Production یافت نشد. صفحه عیب‌یابی مدیر را بررسی کنید."
      : "دریافت درخواست‌ها ناموفق بود." }, 503);
  }
}

export async function PATCH(request: NextRequest) {
  if (!validOrigin(request) || !(await isAdmin())) {
    return json({ error: "دسترسی غیرمجاز است." }, 403);
  }

  try {
    const body = await request.json();

    const id = typeof body.id === "string" ? body.id : "";
    const action = body.action;
    const note = typeof body.note === "string"
      ? body.note.trim().slice(0, 500)
      : "";

    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return json({ error: "شناسه درخواست معتبر نیست." }, 400);
    }

    const db = getSupabaseAdmin();

    const { data: submission, error: lookupError } = await db
      .from("article_lottery_submissions")
      .select("id,status,issued_code")
      .eq("id", id)
      .maybeSingle();

    if (lookupError) throw lookupError;
    if (!submission) return json({ error: "درخواست پیدا نشد." }, 404);

    if (action === "approve") {
      if (submission.status === "issued") {
        return json({ error: "کد قبلاً صادر شده است." }, 409);
      }

      const { error } = await db
        .from("article_lottery_submissions")
        .update({
          status: "approved",
          admin_note: note || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      return json({ ok: true, message: "درخواست تأیید شد." });
    }

    if (action === "reject") {
      if (submission.status === "issued") {
        return json({ error: "درخواست دارای کد صادرشده است." }, 409);
      }

      const { error } = await db
        .from("article_lottery_submissions")
        .update({
          status: "rejected",
          admin_note: note || "درخواست توسط مدیر رد شد.",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      return json({ ok: true, message: "درخواست رد شد." });
    }

    if (action === "issue") {
      if (submission.status !== "approved") {
        return json({
          error: "ابتدا باید درخواست را تأیید کنید.",
        }, 409);
      }

      const code = typeof body.code === "string"
        ? body.code.trim()
        : "";

      if (code.length < 4 || code.length > 60) {
        return json({ error: "کد باید بین ۴ تا ۶۰ کاراکتر باشد." }, 400);
      }

      const { data: updated, error } = await db
        .from("article_lottery_submissions")
        .update({
          status: "issued",
          issued_code: code,
          admin_note: note || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("status", "approved")
        .select("id,status,issued_code")
        .maybeSingle();

      if (error) throw error;
      if (!updated) {
        return json({ error: "وضعیت درخواست تغییر کرده است؛ صفحه را تازه کنید." }, 409);
      }

      return json({
        ok: true,
        code: updated.issued_code,
        message: "کد به پنل کاربر ارسال شد.",
      });
    }

    return json({ error: "عملیات نامعتبر است." }, 400);
  } catch (error) {
    console.error("Admin lottery submissions PATCH:", error);
    return json({ error: "انجام عملیات ناموفق بود." }, 503);
  }
}
