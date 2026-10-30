"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole } from "lucide-react";

const field = "mt-2 w-full rounded-xl border border-[#294157] bg-[#07111d] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#617990] focus:border-[#27a7ec] focus:ring-2 focus:ring-[#27a7ec]/10";
const label = "block text-xs font-medium text-[#b6cadd]";
export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState(""); const [phone, setPhone] = useState("");
  const [recoveryCode, setRecoveryCode] = useState(""); const [newPassword, setNewPassword] = useState("");
  const [visible, setVisible] = useState(false); const [loading, setLoading] = useState(false);
  const [error, setError] = useState(""); const [newRecoveryCode, setNewRecoveryCode] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    try {
      const response = await fetch("/api/user/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reset", email, phone, recoveryCode, newPassword }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "درخواست ناموفق بود.");
      setNewRecoveryCode(data.recoveryCode); setNewPassword(""); setRecoveryCode("");
    } catch (e) { setError(e instanceof Error ? e.message : "خطا در بازیابی رمز."); }
    finally { setLoading(false); }
  }
  return <main dir="rtl" className="flex min-h-[75vh] items-center justify-center px-4 py-12">
    <section className="w-full max-w-[430px] rounded-[24px] border border-[#20354a] bg-[#0b1725] px-6 py-8 shadow-[0_24px_80px_#0003] sm:px-9">
      <Link href="/login" className="mb-8 inline-flex items-center gap-2 text-xs text-[#94a9bd] hover:text-white"><ArrowRight size={16}/> بازگشت به ورود</Link>
      <div className="mb-7 text-center"><div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#21547c] bg-[#0c2d48] text-[#50c4ff]"><LockKeyhole size={23}/></div><h1 className="mb-1 text-2xl font-bold text-[#f0f7ff]">{newRecoveryCode ? "رمز با موفقیت تغییر کرد" : "بازیابی رمز عبور"}</h1><p className="m-0 text-xs leading-7 text-[#8ea5bb]">{newRecoveryCode ? "وارد حسابتان شده‌اید؛ کد جدید را ذخیره کنید." : "برای تغییر رمز، اطلاعات حساب و کد بازیابی را وارد کنید."}</p></div>
      {newRecoveryCode ? <div className="space-y-4"><p className="text-xs leading-7 text-[#a7bbd0]">کد بازیابی قبلی باطل شد. این کد جدید را در محل امن ذخیره کنید؛ دوباره نمایش داده نخواهد شد.</p><div dir="ltr" className="break-all rounded-xl border border-dashed border-[#34617f] bg-[#081321] p-4 text-center font-mono text-sm tracking-wider text-[#8fd7ff] select-all">{newRecoveryCode}</div><button className="w-full rounded-xl border border-[#2a4963] px-4 py-3 text-sm text-white" type="button" onClick={() => { void navigator.clipboard?.writeText(newRecoveryCode); }}>کپی کد جدید</button><button type="button" className="w-full rounded-xl bg-[#138deb] px-4 py-3 text-sm font-bold text-white" onClick={() => { router.replace("/account"); router.refresh(); }}>کد را ذخیره کردم؛ رفتن به حساب</button></div> : <form onSubmit={submit} className="space-y-4">
        <label className={label}>ایمیل ثبت‌شده<input className={field} type="email" autoComplete="email" required dir="ltr" placeholder="name@example.com" value={email} onChange={e => setEmail(e.target.value)}/></label>
        <label className={label}>شماره موبایل ثبت‌شده<input className={field} type="tel" autoComplete="tel" inputMode="tel" required dir="ltr" placeholder="09123456789" value={phone} onChange={e => setPhone(e.target.value)}/></label>
        <label className={label}>کد بازیابی حساب<input className={field} required autoComplete="off" dir="ltr" placeholder="کدی که هنگام ثبت‌نام دریافت کردید" value={recoveryCode} onChange={e => setRecoveryCode(e.target.value)}/></label>
        <label className={label}>رمز عبور جدید<div className="relative"><input className={`${field} pl-12`} required minLength={12} maxLength={128} type={visible ? "text" : "password"} autoComplete="new-password" dir="ltr" placeholder="حداقل ۱۲ کاراکتر" value={newPassword} onChange={e => setNewPassword(e.target.value)}/><button type="button" aria-label={visible ? "مخفی کردن رمز" : "نمایش رمز"} className="absolute left-3 top-1/2 mt-1 -translate-y-1/2 text-[#7e9ab1]" onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></label>
        <p className="text-[11px] leading-6 text-[#849aae]">برای امنیت حساب، فقط تطبیق ایمیل و موبایل کافی نیست و کد بازیابی نیز لازم است.</p>
        {error && <p role="alert" className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}
        <button type="submit" disabled={loading} className="w-full rounded-xl bg-[#138deb] px-4 py-3.5 text-sm font-bold text-white transition hover:bg-[#087bd6] disabled:opacity-50">{loading ? "در حال بررسی..." : "تغییر رمز و ورود به حساب"}</button>
      </form>}
    </section>
  </main>;
}
