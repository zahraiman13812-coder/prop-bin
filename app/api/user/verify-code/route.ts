import { NextRequest, NextResponse } from "next/server";
import { createUserSession, userCookie, verifyLoginCode } from "@/lib/user-auth";
import { validOrigin } from "@/lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!validOrigin(request)) return NextResponse.json({ error: "درخواست نامعتبر است." }, { status: 403 });
  if (Number(request.headers.get("content-length") || 0) > 1024)
    return NextResponse.json({ error: "درخواست بیش از حد بزرگ است." }, { status: 413 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.email !== "string" || typeof body.code !== "string")
    return NextResponse.json({ error: "ایمیل یا کد نامعتبر است." }, { status: 400 });
  try {
    const result = await verifyLoginCode(body.email, body.code.trim());
    if (!result) return NextResponse.json({ error: "کد اشتباه، منقضی یا بیش از حد استفاده شده است." }, { status: 401 });
    const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(userCookie.name, createUserSession(result.user, result.version), userCookie.options);
    return response;
  } catch (error) {
    console.error("Verify login code failed:", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "بررسی کد با خطا مواجه شد. دوباره تلاش کنید." }, { status: 503 });
  }
}
