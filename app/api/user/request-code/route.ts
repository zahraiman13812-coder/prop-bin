
import {
  NextRequest,
  NextResponse,
} from "next/server";

import { validOrigin } from "@/lib/guard";

import {
  issueLoginCode,
  LoginCodeThrottled,
  normalizeEmail,
  validEmail,
} from "@/lib/user-auth";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest
) {
  if (!validOrigin(request)) {
    return NextResponse.json(
      { error: "درخواست نامعتبر است." },
      { status: 403 }
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
    return NextResponse.json(
      { error: "اطلاعات درخواست نامعتبر است." },
      { status: 400 }
    );
  }

  const input = body as Record<string, unknown>;

  const mode = input.mode ?? "login";

  // Only login and registration are allowed.
  if (
    mode !== "login" &&
    mode !== "register"
  ) {
    return NextResponse.json(
      { error: "نوع درخواست نامعتبر است." },
      { status: 400 }
    );
  }

  const email = normalizeEmail(
    typeof input.email === "string"
      ? input.email
      : ""
  );

  if (!validEmail(email)) {
    return NextResponse.json(
      { error: "ایمیل معتبر وارد کنید." },
      { status: 400 }
    );
  }

  const name =
    typeof input.name === "string"
      ? input.name.trim()
      : "";

  if (
    mode === "register" &&
    (name.length < 2 || name.length > 80)
  ) {
    return NextResponse.json(
      {
        error:
          "نام نمایشی باید بین ۲ تا ۸۰ کاراکتر باشد.",
      },
      { status: 400 }
    );
  }

  try {
    await issueLoginCode(
      email,
      mode,
      name
    );

    return NextResponse.json(
      {
        ok: true,
        message:
          "درخواست کد تأیید با موفقیت ثبت شد.",
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    if (error instanceof LoginCodeThrottled) {
      return NextResponse.json({ error: error.message }, {
        status: 429, headers: { "Cache-Control": "no-store", "Retry-After": "60" },
      });
    }
    console.error(
      "Login code request failed:",
      error instanceof Error
        ? error.message
        : "Unknown error"
    );

    return NextResponse.json(
      {
        error: "ارسال کد فعلاً امکان‌پذیر نیست. دوباره تلاش کنید.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
