
import {
  NextRequest,
  NextResponse,
} from "next/server";

import { validOrigin } from "@/lib/guard";

import {
  createUserSession,
  normalizeEmail,
  userCookie,
  validEmail,
  verifyLoginCode,
} from "@/lib/user-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: NextRequest) {
  if (!validOrigin(request)) {
    return json(
      { error: "درخواست نامعتبر است." },
      403
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
    return json(
      { error: "اطلاعات درخواست نامعتبر است." },
      400
    );
  }

  const input = body as Record<string, unknown>;

  const email = normalizeEmail(
    typeof input.email === "string"
      ? input.email
      : ""
  );

  const code =
    typeof input.code === "string"
      ? input.code.trim()
      : "";

  if (!validEmail(email) || !/^\d{6}$/.test(code)) {
    return json(
      { error: "ایمیل یا کد نامعتبر است." },
      400
    );
  }

  try {
    const user = await verifyLoginCode(email, code);

    if (!user) {
      return json(
        {
          error: "کد اشتباه یا منقضی شده است.",
        },
        401
      );
    }

    const response = json({ ok: true });

    response.cookies.set(
      userCookie.name,
      createUserSession(user),
      userCookie.options
    );

    return response;
  } catch (error) {
    console.error(
      "Verify login code failed:",
      error instanceof Error
        ? error.message
        : "Unknown error"
    );

    return json(
      {
        error:
          "تأیید کد فعلاً امکان‌پذیر نیست. دوباره تلاش کنید.",
      },
      503
    );
  }
}
