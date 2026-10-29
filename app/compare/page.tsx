"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import type { CSSProperties } from "react";
import type { Firm } from "@/lib/data";
import FirmLogo from "@/components/FirmLogo";
type FirmField =
  | "rating"
  | "capital"
  | "profit"
  | "fee"
  | "code"
  | "discount"
  | "challenge"
  | "payout";

const rows: {
  label: string;
  key: FirmField;
  format?: (value: string) => string;
}[] = [
  {
    label: "امتیاز کاربران",
    key: "rating",
    format: (value) => "★ " + value + " / ۵",
  },
  { label: "حداکثر سرمایه", key: "capital" },
  { label: "سهم سود", key: "profit" },
  { label: "هزینه شروع", key: "fee" },
  { label: "کد تخفیف", key: "code" },
  { label: "میزان تخفیف", key: "discount" },
  { label: "نوع چالش", key: "challenge" },
  { label: "پرداخت سود", key: "payout" },
];

export default function ComparePage() {
  const [firms, setFirms] = useState<Firm[]>([]);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/firms")
  .then((response) => {
    if (!response.ok) {
      throw new Error("خطا در دریافت شرکت‌ها");
    }

    return response.json();
  })
  .then((data) => {
    if (!data.success || !Array.isArray(data.firms)) {
      throw new Error("اطلاعات دریافتی نامعتبر است");
    }

    const entries = data.firms as Firm[];
        setFirms(entries);

        /*
         * `/firms` links here with ?firms=<id>. Use that selection when it
         * contains valid ids; otherwise fall back to the first four firms.
         */
        const requested = new URLSearchParams(
          window.location.search
        )
          .get("firms")
          ?.split(",")
          .map((id) => {
            try {
              return decodeURIComponent(id.trim());
            } catch {
              return "";
            }
          })
          .filter(Boolean);

        const valid = (requested || [])
          .filter((id) =>
            entries.some((firm) => firm.id === id)
          )
          .slice(0, 5);

        setSelected(
          valid.length
            ? valid
            : entries.slice(0, 4).map((firm) => firm.id)
        );
      })
      .catch(() => {});
  }, []);

  const visible = useMemo(
    () =>
      firms.filter((firm) =>
        selected.includes(firm.id)
      ),
    [firms, selected]
  );

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : current.length < 5
          ? [...current, id]
          : current
    );
  }

  return (
    <div className="page-shell">
      <div className="container">
        <div className="page-heading">
          <span className="eyebrow">مقایسه کنار هم</span>
          <h1>
            مقایسه <em>شرکت‌های پراپ</em>
          </h1>
          <p>
            شرکت‌هایی را که می‌خواهی بررسی کنی انتخاب کن. جدول
            برای نمایش در موبایل هم قابل پیمایش است.
          </p>
        </div>

        <div className="compare-select">
          <b>انتخاب شرکت‌ها</b>
          <div className="select-chips">
            {firms.map((firm) => (
              <button
                key={firm.id}
                onClick={() => toggle(firm.id)}
                className={
                  selected.includes(firm.id)
                    ? "selected"
                    : ""
                }
                aria-pressed={selected.includes(firm.id)}
              >
                <span>＋</span>
                {firm.name}
              </button>
            ))}
          </div>
          <small>حداکثر ۵ شرکت قابل انتخاب است.</small>
        </div>

        <div className="table-wrap">
          <table className="compare-table">
            <thead>
              <tr>
                <th>معیار</th>
                {visible.map((firm) => (
                  <th key={firm.id}>
                    <FirmLogo
                      firm={firm}
                      className="table-mark overflow-hidden"
                      imageClassName="h-full w-full object-contain p-1"
                      style={
                        {
                          "--firm-color": firm.color,
                        } as CSSProperties
                      }
                    />
                    {firm.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key}>
                  <th>{row.label}</th>
                  {visible.map((firm) => (
                    <td key={firm.id}>
                      {row.format
                        ? row.format(firm[row.key])
                        : firm[row.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="table-disclaimer">
          * مقادیر بالا نمونه نمایشی هستند و توصیه مالی محسوب
          نمی‌شوند. پیش از انتشار، اطلاعات و تاریخ آخرین بررسی
          را تأیید کنید.
        </p>
      </div>
    </div>
  );
}
