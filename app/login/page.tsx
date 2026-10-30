"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowLeft, Eye, EyeOff, ShieldCheck } from "lucide-react";

type Mode = "login" | "register";
const field = "mt-2 w-full rounded-xl border border-[#294157] bg-[#07111d] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#617990] focus:border-[#27a7ec] focus:ring-2 focus:ring-[#27a7ec]/10";
const label = "block text-xs font-medium text-[#b6cadd]";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const next = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("next") : null;
  const destination = next?.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/account";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    try {
      const body = mode === "login" ? { action: "login", identifier, password } : { action: "register", name, email, phone, password };
      const response = await fetch("/api/user/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "درخواست ناموفق بود.");
      if (result.recoveryCode) { setRecoveryCode(result.recoveryCode); setPassword(""); return; }
      router.replace(destination); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "خطا در انجام درخواست."); }
    finally { setLoading(false); }
  }

  return (
    <main dir="rtl" className="flex min-h-[75vh] items-center justify-center px-4 py-12">
      <section className="w-full max-w-[430px] rounded-[24px] border border-[#20354a] bg-[#0b1725] px-6 py-8 shadow-[0_24px_80px_#0003] sm:px-9">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#21547c] bg-[#0c2d48] text-[#50c4ff]"><ShieldCheck size={24}/></div>
          <h1 className="mb-1 text-2xl font-bold text-[#f0f7ff]">{recoveryCode ? "حساب شما آماده است" : mode === "login" ? "خوش اومدی به پراپین" : "ساخت حساب کاربری"}</h1>
          <p className="m-0 text-xs leading-7 text-[#8ea5bb]">{recoveryCode ? "این کد بازیابی را در جای امن ذخیره کنید." : mode === "login" ? "برای ادامه وارد حساب خود شوید" : "فقط چند قدم تا پیوستن به پراپین"}</p>
        </div>
        {recoveryCode ? <div className="space-y-4">
          <p className="text-sm leading-8 text-[#a7bbd0]">در صورت فراموشی رمز، برای حفظ امنیت حساب به این کد نیاز دارید. این کد فقط یک‌بار نمایش داده می‌شود.</p>
          <div dir="ltr" className="break-all rounded-xl border border-dashed border-[#34617f] bg-[#081321] p-4 text-center font-mono text-sm tracking-wider text-[#8fd7ff] select-all">{recoveryCode}</div>
          <button type="button" onClick={() => { void navigator.clipboard?.writeText(recoveryCode); }} className="w-full rounded-xl border border-[#2a4963] px-4 py-3 text-sm text-white">کپی کد بازیابی</button>
          <button type="button" onClick={() => { router.replace(destination); router.refresh(); }} className="w-full rounded-xl bg-[#138deb] px-4 py-3 text-sm font-semibold text-white">کد را ذخیره کردم؛ ورود به حساب</button>
        </div> : <>
          <div className="mb-7 grid grid-cols-2 gap-1 rounded-xl border border-[#243b51] bg-[#07111c] p-1">
            {([ ["login", "ورود"], ["register", "ثبت‌نام"] ] as const).map(([value, title]) => <button key={value} type="button" aria-pressed={mode === value} onClick={() => { setMode(value); setError(""); }} className={`rounded-lg py-2.5 text-xs font-semibold transition ${mode === value ? "bg-[#163a57] text-[#d5efff] shadow-sm" : "text-[#829ab0] hover:text-white"}`}>{title}</button>)}
          </div>
          <form onSubmit={submit} className="space-y-4">
            {mode === "register" && <label className={label}>نام و نام خانوادگی<input className={field} required minLength={2} maxLength={80} autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder="نام شما"/></label>}
            {mode === "login" ? <label className={label}>ایمیل یا شماره موبایل<input className={field} required autoComplete="username" dir="auto" value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder="example@gmail.com یا 0912..."/></label> : <>
              <label className={label}>ایمیل<input className={field} required type="email" autoComplete="email" dir="ltr" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com"/></label>
              <label className={label}>شماره موبایل<input className={field} required type="tel" inputMode="tel" autoComplete="tel" dir="ltr" value={phone} onChange={e => setPhone(e.target.value)} placeholder="09123456789"/></label>
            </>}
            <label className={label}>رمز عبور<div className="relative"><input className={`${field} pl-12`} required type={visible ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={mode === "register" ? 12 : 1} maxLength={128} dir="ltr" value={password} onChange={e => setPassword(e.target.value)} placeholder={mode === "register" ? "حداقل ۱۲ کاراکتر" : "رمز عبور"}/><button type="button" className="absolute left-3 top-1/2 mt-1 -translate-y-1/2 text-[#7e9ab1]" aria-label={visible ? "مخفی کردن رمز" : "نمایش رمز"} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></label>
            {mode === "login" && <div className="text-left"><Link className="text-xs text-[#55c1ff] hover:underline" href="/forgot-password">بازیابی رمز عبور</Link></div>}
            {error && <p role="alert" className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}
            <button disabled={loading} type="submit" className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#138deb] px-4 py-3.5 text-sm font-bold text-white transition hover:bg-[#087bd6] disabled:opacity-50">{loading ? "در حال بررسی..." : mode === "login" ? "ورود به حساب" : "ایجاد حساب"}<ArrowLeft size={17}/></button>
          </form>
          <p className="mb-0 mt-6 text-center text-[11px] leading-6 text-[#6f879d]">اطلاعات شما به‌صورت امن نگهداری می‌شود.</p>
        </>}
      </section>
    </main>
  );
}
