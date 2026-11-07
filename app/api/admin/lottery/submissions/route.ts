
import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getSupabaseAdmin, withDatabaseTransaction } from "@/lib/supabase-admin";
import { validOrigin } from "@/lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SubmissionRow = {
  id: string; name: string | null; email: string | null; period: string;
  images: unknown; status: "pending" | "approved" | "rejected" | "issued";
  issued_code: string | null; admin_note: string | null; created_at: string;
};

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

    const submissions = (data || []).map((row: SubmissionRow) => ({
      ...row,
      name: row.name?.trim() || row.email?.split("@")[0] || "کاربر پراپ‌بین",
      images: Array.isArray(row.images)
        ? row.images
        : typeof row.images === "string"
          ? (() => { try { const parsed = JSON.parse(row.images); return Array.isArray(parsed) ? parsed : []; } catch { return []; } })()
          : [],
    }));
    return json({ submissions });
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
      const code = typeof body.code === "string" ? body.code.trim() : "";
      if (code.length < 4 || code.length > 60) {
        return json({ error: "کد باید بین ۴ تا ۶۰ کاراکتر باشد." }, 400);
      }

      const result = await withDatabaseTransaction(async (client) => {
        const locked = await client.query(
          `SELECT id, user_id, name, email, period, status, issued_code
           FROM public.article_lottery_submissions
           WHERE id = $1
           FOR UPDATE`,
          [id]
        );
        const row = locked.rows[0] as {
          id: string; user_id: string; name: string; email: string;
          period: string; status: string; issued_code: string | null;
        } | undefined;

        if (!row) return { kind: "missing" as const };
        if (row.status !== "approved") {
          if (row.status === "issued" && row.issued_code === code) {
            const existing = await client.query(
              `SELECT id FROM public.article_lottery_entries
               WHERE user_id = $1 AND period = $2`,
              [row.user_id, row.period]
            );
            return existing.rowCount
              ? { kind: "already-issued" as const, entryId: existing.rows[0].id }
              : { kind: "conflict" as const };
          }
          return { kind: "conflict" as const };
        }

        // The canonical participant table powers the admin list and winner selection.
        const participant = await client.query(
          `INSERT INTO public.article_lottery_entries
             (user_id, name, email, code, period, created_at)
           VALUES ($1, $2, $3, $4, $5, now())
           ON CONFLICT (user_id, period)
           DO UPDATE SET
             name = EXCLUDED.name,
             email = EXCLUDED.email,
             code = EXCLUDED.code
           RETURNING id`,
          [row.user_id, row.name?.trim() || row.email?.split("@")[0] || "کاربر پراپ‌بین", row.email, code, row.period]
        );

        await client.query(
          `UPDATE public.article_lottery_submissions
           SET status = 'issued', issued_code = $2, admin_note = $3, reviewed_at = now()
           WHERE id = $1 AND status = 'approved'`,
          [id, code, note || null]
        );

        return { kind: "issued" as const, entryId: participant.rows[0].id };
      });

      if (result.kind === "missing") return json({ error: "درخواست پیدا نشد." }, 404);
      if (result.kind === "conflict") {
        return json({ error: "وضعیت درخواست تغییر کرده یا این کد قبلاً صادر شده است. صفحه را تازه کنید." }, 409);
      }

      return json({
        ok: true,
        code,
        entryId: result.entryId,
        message: result.kind === "already-issued"
          ? "این کد قبلاً صادر شده و شرکت‌کننده در فهرست اصلی موجود است."
          : "کد صادر شد و شرکت‌کننده به فهرست اصلی قرعه‌کشی اضافه شد.",
      });
    }

    return json({ error: "عملیات نامعتبر است." }, 400);
  } catch (error) {
    console.error("Admin lottery submissions PATCH:", error);
    if (error && typeof error === "object" && "code" in error && error.code === "23505") {
      return json({ error: "این کد قبلاً برای شرکت‌کننده دیگری ثبت شده است. کد دیگری انتخاب کنید." }, 409);
    }
    return json({ error: "انجام عملیات ناموفق بود." }, 503);
  }
}
