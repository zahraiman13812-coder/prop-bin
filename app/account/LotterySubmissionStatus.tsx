"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Submission = { status: "pending" | "approved" | "rejected" | "issued"; issued_code: string | null; admin_note: string | null; created_at: string };
const labels: Record<Submission["status"], string> = {
  pending: "در انتظار بررسی مدیر", approved: "تأیید شده؛ در انتظار دریافت کد",
  rejected: "رد شده", issued: "کد صادر شده",
};
export default function LotterySubmissionStatus() {
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [legacyCode, setLegacyCode] = useState("");
  const [period, setPeriod] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [s, l] = await Promise.all([
          fetch("/api/lottery/submission", { cache: "no-store" }),
          fetch("/api/lottery", { cache: "no-store" }),
        ]);
        const sr = await s.json();
        if (!s.ok) throw new Error(sr.error || "دریافت وضعیت ناموفق بود.");
        const lr = l.ok ? await l.json() : null;
        if (active) {
          setSubmission(sr.submission || null);
          setPeriod(sr.period || lr?.period || "");
          setLegacyCode(lr?.entry?.code || "");
        }
      } catch (err) { if (active) setError(err instanceof Error ? err.message : "خطا در دریافت وضعیت"); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, []);
  return <section className="rounded-2xl border border-border-theme bg-surface p-5 sm:p-7">
    <h2 className="text-lg font-extrabold">🎟️ درخواست قرعه‌کشی مقاله‌ای من</h2>
    {loading ? <p className="mt-3 text-sm text-muted">در حال بررسی...</p> : error ? <p className="mt-3 text-sm text-red-500">{error}</p> : <div className="mt-4 space-y-3">
      {period && <p className="text-sm text-muted">دوره: {period}</p>}
      {submission ? <>
        <p className="font-semibold">وضعیت: {labels[submission.status]}</p>
        <p className="text-xs text-muted">تاریخ درخواست: {new Date(submission.created_at).toLocaleString("fa-IR")}</p>
        {submission.admin_note && <p className="text-sm">توضیح مدیر: {submission.admin_note}</p>}
        {submission.status === "issued" && submission.issued_code && <div className="rounded-xl bg-primary/10 p-4">
          <p className="mb-2 font-bold">کد اختصاصی شما</p>
          <p dir="ltr" className="break-all text-center font-mono text-lg font-extrabold text-primary">{submission.issued_code}</p>
        </div>}
      </> : legacyCode ? <>
        <p className="text-sm">کد ثبت‌شده قبلی شما:</p><p dir="ltr" className="break-all font-mono font-bold text-primary">{legacyCode}</p>
      </> : <p className="text-sm text-muted">هنوز درخواستی برای این دوره ثبت نکرده‌اید.</p>}
      <Link href="/lottery" className="inline-block font-bold text-primary underline">مشاهده صفحه قرعه‌کشی</Link>
    </div>}
  </section>;
}
