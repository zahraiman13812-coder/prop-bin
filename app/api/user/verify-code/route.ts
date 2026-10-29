import { NextResponse } from "next/server";
export async function POST() {
  return NextResponse.json({ error: "ورود با کد ایمیل غیرفعال شده است. از ورود با رمز عبور استفاده کنید." }, { status: 410 });
}
