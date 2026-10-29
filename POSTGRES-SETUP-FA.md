# راه‌اندازی پروژه با PostgreSQL بدون Supabase

## نصب‌های موردنیاز
1. **Node.js 22 LTS** و npm
2. **PostgreSQL 16 یا 17** همراه با `psql`
3. برای ارسال کد ورود واقعی: حساب **Resend** و دامنه تأییدشده

## ساخت دیتابیس
در ترمینال وارد psql شوید (نام کاربری و گذرواژه PostgreSQL خودتان):

```bash
psql -U postgres -h localhost
```

در محیط psql:
```sql
CREATE DATABASE propin;
\q
```

سپس از پوشه پروژه:
```bash
psql -U postgres -h localhost -d propin -f database/schema.sql
```

## نصب و اجرا
```bash
npm install
cp .env.example .env.local
```

در `.env.local` رمز دیتابیس و ۳ مقدار محرمانه را تنظیم کنید. برای ساخت secret:
```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

دو بار برای ADMIN_SESSION_SECRET و USER_AUTH_SECRET اجرا کنید. سپس:
```bash
npm run dev
```

آدرس: http://localhost:3000

## نکات مهم
- اطلاعات قبلی Supabase فقط اگر بکاپ داشته باشید قابل برگرداندن است. این نسخه دیتابیس **جدید و خالی** می‌سازد.
- فایل‌های آپلودی در پوشه `.uploads` سرور ذخیره می‌شوند؛ **هم دیتابیس و هم این پوشه** باید بکاپ شوند. از فضای دائمی در هاست استفاده کنید، نه سرویس‌هایی با فایل‌سیستم موقت.
- فقط سمت سرور به DATABASE_URL دسترسی دارد. هرگز در `NEXT_PUBLIC_` نگذارید.
- قبل از استفاده در محیط واقعی، مسیرهای مربوط به گردونه شانس و آپلودها و تمام عملیات پنل ادمین را با دیتای واقعی تست کنید.
- کد فعلی در برخی فایل‌ها متن خطا با نام Supabase نشان می‌دهد؛ این متن‌ها مربوط به گذشته‌اند.
