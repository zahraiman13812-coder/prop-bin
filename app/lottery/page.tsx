"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type Info = {
  enabled: boolean;
  title: string;
  description: string;
  articleSlug: string;
  period: string;
  signedIn: boolean;
  entry: null | { code: string; createdAt: string };
  winner: null | { name: string; period: string; selectedAt: string };
};

const joinPath = "/lottery?join=1";
const loginPath = `/login?next=${encodeURIComponent(joinPath)}`;

export default function LotteryPage() {
  const params = useSearchParams();
  const fromArticle = params.get("join") === "1";
  const attempted = useRef(false);
  const [info, setInfo] = useState<Info | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function join() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/lottery", { method: "POST" });
      const data = await response.json();
      if (response.status === 401) {
        window.location.assign(loginPath);
        return;
      }
      if (!response.ok) throw new Error(data.error || "دریافت کد ناموفق بود");
      setInfo(previous => previous ? { ...previous, entry: { code: data.code, createdAt: data.createdAt } } : previous);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "خطا در صدور کد");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    fetch("/api/lottery", { cache: "no-store" })
      .then(response => { if (!response.ok) throw new Error(); return response.json(); })
      .then(setInfo)
      .catch(() => setError("دریافت اطلاعات قرعه‌کشی ممکن نشد."));
  }, []);

  useEffect(() => {
    if (!info || !info.enabled || !fromArticle || info.entry || attempted.current) return;
    attempted.current = true;
    if (!info.signedIn) {
      window.location.replace(loginPath);
      return;
    }
    void join();
  }, [info, fromArticle]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:py-20">
      <section className="rounded-3xl border border-border-theme bg-surface p-6 text-center shadow-xl sm:p-12">
        <div className="mb-5 text-6xl" aria-hidden="true">🎟️</div>
        <h1 className="text-2xl font-extrabold sm:text-4xl">{info?.title || "قرعه‌کشی مقالات"}</h1>
        {!info ? <p className="mt-6">در حال دریافت اطلاعات...</p> : !info.enabled ? (
          <p className="mt-6 text-muted">این قرعه‌کشی فعلاً فعال نیست.</p>
        ) : (
          <>
            <p className="mt-5 leading-8 text-muted">{info.description}</p>
            <p className="mt-3 text-sm text-muted">دوره: {info.period}</p>
            {info.articleSlug && <Link href={`/articles/${encodeURIComponent(info.articleSlug)}`} className="mt-6 inline-block rounded-xl border border-primary px-5 py-3 font-bold text-primary">مطالعه شرایط در مقاله ←</Link>}
            <div className="mt-7">
              {info.entry ? (
                <div className="rounded-2xl border border-primary bg-primary/5 p-6">
                  <p className="font-bold">کد اختصاصی شرکت شما در قرعه‌کشی</p>
                  <div className="mt-4 break-all font-mono text-xl font-extrabold" dir="ltr">{info.entry.code}</div>
                  <p className="mt-3 text-sm text-muted">این کد در پنل شما ثبت شده و برای مدیر هم قابل مشاهده است.</p>
                  <Link href="/account" className="mt-4 inline-block text-primary">مشاهده کد در پنل کاربری ←</Link>
                </div>
              ) : busy ? (
                <p role="status" className="font-semibold text-muted">در حال ثبت شرکت و صدور کد اختصاصی...</p>
              ) : !info.signedIn ? (
                <Link href={loginPath} className="inline-block rounded-xl bg-primary px-7 py-3 font-bold text-white">ورود / ثبت‌نام و دریافت کد</Link>
              ) : (
                <button type="button" onClick={join} className="rounded-xl bg-primary px-7 py-3 font-bold text-white">شرکت و دریافت کد اختصاصی</button>
              )}
            </div>
          </>
        )}
        {info?.winner && (
          <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 text-right">
            <p className="text-sm font-bold text-emerald-700">برنده این دوره اعلام شد</p>
            <p className="mt-2 text-xl font-extrabold">{info.winner.name}</p>
            <p className="mt-1 text-sm text-muted">دوره: {info.winner.period}</p>
          </div>
        )}
        {error && <p role="alert" className="mt-5 text-red-500">{error}</p>}
      </section>
    </main>
  );
}
