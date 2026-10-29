
"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import FirmLogo from "@/components/FirmLogo";
import type { Firm } from "@/lib/data";

type FirmsApiResponse = {
  success: boolean;
  firms?: Firm[];
  error?: string;
};

export default function DiscountsPage() {
  const [copied, setCopied] = useState("");
  const [firms, setFirms] = useState<Firm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadFirms() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/firms", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("دریافت شرکت‌ها ناموفق بود.");
        }

        const data =
          (await response.json()) as FirmsApiResponse;

        if (!data.success || !Array.isArray(data.firms)) {
          throw new Error(
            data.error || "اطلاعات شرکت‌ها نامعتبر است."
          );
        }

        if (!controller.signal.aborted) {
          setFirms(data.firms);
        }
      } catch (err) {
        if (controller.signal.aborted) return;

        setError(
          err instanceof Error
            ? err.message
            : "خطا در دریافت کدهای تخفیف"
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadFirms();

    return () => controller.abort();
  }, []);

  async function copy(code: string) {
    if (!code) return;

    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied(""), 1800);
    } catch {
      setCopied("error");
    }
  }

  return (
    <div className="page-shell">
      <div className="container">
        <div className="page-heading">
          <span className="eyebrow">پیشنهادهای ویژه</span>

          <h1>
            کدهای <em>تخفیف پراپ</em>
          </h1>

          <p>
            کدهای تخفیف را مشاهده و کپی کن. اعتبار هر کد
            باید با شرکت مربوطه بررسی شود.
          </p>
        </div>

        {loading && (
          <p
            role="status"
            className="rounded-xl border border-border-theme bg-surface p-8 text-center text-sm text-muted"
          >
            در حال دریافت کدهای تخفیف...
          </p>
        )}

        {!loading && error && (
          <p
            role="alert"
            className="rounded-xl border border-red-500/30 bg-surface p-8 text-center text-sm text-red-500"
          >
            {error}
          </p>
        )}

        {!loading && !error && (
          <>
            <div className="discount-list">
              {firms.map((firm) => (
                <article
                  className="discount-row"
                  id={firm.id}
                  key={firm.id}
                >
                  <FirmLogo
                    firm={firm}
                    className="firm-mark"
                    style={
                      {
                        "--firm-color": firm.color,
                      } as CSSProperties
                    }
                  />

                  <div className="discount-company">
                    <b>{firm.name}</b>
                    <small>کد اختصاصی پراپین</small>
                  </div>

                  <div className="discount-amount">
                    <b>{firm.discount || "—"}</b>
                    <small>تخفیف</small>
                  </div>

                  <div className="coupon-code">
                    <span>
                      {firm.code || "بدون کد"}
                    </span>

                    <button
                      type="button"
                      disabled={!firm.code}
                      onClick={() => copy(firm.code)}
                    >
                      {copied === firm.code
                        ? "کپی شد ✓"
                        : copied === "error"
                          ? "کپی نشد"
                          : "کپی کد"}
                    </button>
                  </div>
                </article>
              ))}
            </div>

            {firms.length === 0 && (
              <p className="rounded-xl border border-border-theme bg-surface p-8 text-center text-sm text-muted">
                هنوز شرکتی برای نمایش ثبت نشده است.
              </p>
            )}
          </>
        )}

        <div className="disclaimer">
          <div className="container">
            <span>ⓘ</span>
            <p>
              کدها و درصدهای نمایش‌داده‌شده نمونه هستند.
              پیش از انتشار، فعال بودن و شرایط استفاده
              از هر کد را تأیید کنید.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
