import { NextRequest, NextResponse } from "next/server";
import { issueLoginCode, LoginCodeThrottled } from "@/lib/user-auth";
import { validOrigin } from "@/lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!validOrigin(request)) return NextResponse.json({ error: "درخواست نامعتبر است." }, { status: 403 });
  if (Number(request.headers.get("content-length") || 0) > 2048)
    return NextResponse.json({ error: "اطلاعات بیش از حد مجاز است." }, { status: 413 });
  const body = await request.json().catch(() => null);
  if (!body || (body.mode !== "login" && body.mode !== "register") || typeof body.email !== "string" ||
      (body.mode === "register" && typeof body.name !== "string"))
    return NextResponse.json({ error: "اطلاعات درخواست نامعتبر است." }, { status: 400 });
  try {
    await issueLoginCode(body.email, body.mode, typeof body.name === "string" ? body.name : "");
    return NextResponse.json({ ok: true, message: "کد شش‌رقمی به ایمیل شما ارسال شد. اعتبار آن ۱۰ دقیقه است." },
      { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof LoginCodeThrottled)
      return NextResponse.json({ error: error.message }, { status: 429 });
    const message = error instanceof Error ? error.message : "ارسال کد ناموفق بود.";
    console.error("Request login code failed:", error instanceof Error ? error.name : "unknown");
    const status = message.includes("ثبت") || message.includes("ایمیل معتبر") || message.includes("نام باید") ? 400 : 503;
    return NextResponse.json({ error: message }, { status });
  }
}
