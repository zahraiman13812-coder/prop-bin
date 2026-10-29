
const apiKey = process.env.RESEND_API_KEY;
const from = process.env.MAIL_FROM;
const to = process.argv[2];

if (!apiKey || !from) {
  console.error(
    "RESEND_API_KEY یا MAIL_FROM تنظیم نشده است."
  );
  process.exit(1);
}

if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
  console.error(
    "ایمیل مقصد را در انتهای دستور وارد کنید."
  );
  process.exit(1);
}

try {
  const response = await fetch(
    "https://api.resend.com/emails",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: "تست ارسال ایمیل پراپ بین",
        text: "سیستم ارسال ایمیل پراپ بین فعال است.",
      }),
    }
  );

  const result = await response.json();

  console.log("HTTP Status:", response.status);

  if (!response.ok) {
    console.error("Resend error:", {
      name: result.name,
      message: result.message,
      statusCode: result.statusCode,
    });
    process.exitCode = 1;
  } else {
    console.log("ارسال توسط Resend پذیرفته شد.");
    console.log("Email ID:", result.id);
  }
} catch (error) {
  console.error(
    "خطا در اتصال به Resend:",
    error instanceof Error
      ? error.message
      : "خطای ناشناخته"
  );
  process.exitCode = 1;
}
