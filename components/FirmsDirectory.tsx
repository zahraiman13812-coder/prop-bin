
"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Search,
  SlidersHorizontal,
  Star,
  X,
} from "lucide-react";

import type { Firm } from "@/lib/data";
import FirmLogo from "@/components/FirmLogo";

type SortKey =
  | "all"
  | "rating"
  | "profit"
  | "capital"
  | "fee";

const filters: {
  id: SortKey;
  label: string;
}[] = [
  { id: "all", label: "همه" },
  { id: "rating", label: "بالاترین امتیاز" },
  { id: "profit", label: "بیشترین سود" },
  { id: "capital", label: "بیشترین سرمایه" },
  { id: "fee", label: "کمترین هزینه" },
];

function numberValue(value: string) {
  const englishDigits = value.replace(
    /[۰-۹٠-٩]/g,
    (digit) => {
      const persian = "۰۱۲۳۴۵۶۷۸۹";
      const arabic = "٠١٢٣٤٥٦٧٨٩";

      const pi = persian.indexOf(digit);
      const ai = arabic.indexOf(digit);

      return String(pi >= 0 ? pi : ai);
    }
  );

  const numeric = englishDigits
    .replace(/,/g, "")
    .match(/-?\d+(?:\.\d+)?/);

  return numeric ? Number(numeric[0]) : 0;
}

function FirmStars({ rating }: { rating: string }) {
  const score = Math.max(
    0,
    Math.min(5, numberValue(rating))
  );

  return (
    <div
      className="flex items-center gap-1"
      aria-label={`امتیاز ${rating} از پنج`}
    >
      <span className="text-xs font-bold text-foreground">
        {rating}
      </span>

      <div className="flex items-center gap-px">
        {[1, 2, 3, 4, 5].map((value) => (
          <Star
            key={value}
            size={12}
            strokeWidth={1.5}
            className={
              value <= Math.round(score)
                ? "fill-amber-400 text-amber-400"
                : "fill-transparent text-muted"
            }
          />
        ))}
      </div>
    </div>
  );
}

export default function FirmsDirectory({
  firms,
}: {
  firms: Firm[];
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("all");
  const [selected, setSelected] =
    useState<string | null>(null);

  const visibleFirms = useMemo(() => {
    const search = query
      .trim()
      .toLocaleLowerCase();

    const result = firms.filter((firm) =>
      [
        firm.name,
        firm.description,
        firm.challenge,
      ]
        .join(" ")
        .toLocaleLowerCase()
        .includes(search)
    );

    if (sort === "rating") {
      result.sort(
        (a, b) =>
          numberValue(b.rating) -
          numberValue(a.rating)
      );
    }

    if (sort === "profit") {
      result.sort(
        (a, b) =>
          numberValue(b.profit) -
          numberValue(a.profit)
      );
    }

    if (sort === "capital") {
      result.sort(
        (a, b) =>
          numberValue(b.capital) -
          numberValue(a.capital)
      );
    }

    if (sort === "fee") {
      result.sort(
        (a, b) =>
          numberValue(a.fee) -
          numberValue(b.fee)
      );
    }

    return result;
  }, [firms, query, sort]);

  /*
   * Firm cards on the home page link to /firms#<id>. The anchor exists now,
   * so also expand the matching company and bring it below the sticky header.
   */
  useEffect(() => {
    function openFromHash() {
      const raw = window.location.hash.slice(1);
      if (!raw) return;

      let id = raw;
      try {
        id = decodeURIComponent(raw);
      } catch {
        // Keep the raw value when it is not valid percent-encoding.
      }

      if (!firms.some((firm) => firm.id === id)) {
        return;
      }

      setSelected(id);

      requestAnimationFrame(() => {
        document
          .getElementById(id)
          ?.scrollIntoView({
            block: "start",
            behavior: "smooth",
          });
      });
    }

    openFromHash();
    window.addEventListener("hashchange", openFromHash);

    return () => {
      window.removeEventListener(
        "hashchange",
        openFromHash
      );
    };
  }, [firms]);

  return (
    <div
      className="min-h-screen bg-background text-foreground"
      dir="rtl"
    >
      <section className="border-b border-border-theme bg-surface">
        <div className="mx-auto max-w-[1100px] px-3 pb-7 pt-9 sm:px-6 sm:pb-10 sm:pt-14">
          <div className="text-center">
            <span className="text-xs font-semibold text-primary">
              بررسی و انتخاب هوشمند
            </span>

            <h1 className="mt-3 text-2xl font-extrabold leading-relaxed sm:text-4xl">
              بررسی <span className="text-primary">پراپ‌ها</span>
            </h1>

            <p className="mx-auto mt-2 max-w-xl text-xs leading-7 text-muted sm:text-sm">
              تحلیل کامل و مقایسه شرکت‌های پراپ
              برای انتخاب آگاهانه‌تر
            </p>
          </div>

          {/* Search */}
          <div className="relative mt-7">
            <Search
              size={19}
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted"
            />

            <input
              type="search"
              value={query}
              onChange={(event) =>
                setQuery(event.target.value)
              }
              placeholder="جست‌وجوی نام شرکت پراپ..."
              aria-label="جست‌وجوی شرکت‌ها"
              className="h-12 w-full rounded-xl border border-border-theme bg-background pr-11 pl-11 text-sm text-foreground outline-none transition-colors placeholder:text-muted focus:border-primary"
            />

            {query && (
              <button
                type="button"
                aria-label="پاک کردن جست‌وجو"
                onClick={() => setQuery("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted hover:text-primary"
              >
                <X size={17} />
              </button>
            )}
          </div>

          {/* Sorting filters */}
          <div className="mt-4 flex items-center gap-2">
            <SlidersHorizontal
              size={17}
              className="hidden shrink-0 text-muted sm:block"
            />

            <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {filters.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setSort(filter.id)}
                  aria-pressed={sort === filter.id}
                  className={`shrink-0 cursor-pointer whitespace-nowrap rounded-lg border px-3 py-2 text-[11px] font-semibold transition-colors sm:px-4 sm:text-xs ${
                    sort === filter.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border-theme bg-surface-secondary text-muted hover:border-primary hover:text-foreground"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1100px] px-3 py-5 sm:px-6 sm:py-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold sm:text-base">
            لیست شرکت‌های پراپ
          </h2>

          <span className="text-xs text-muted">
            {visibleFirms.length.toLocaleString("fa-IR")} شرکت
          </span>
        </div>

        {/* Firm list */}
        <div className="space-y-3">
          {visibleFirms.map((firm) => {
            const expanded = selected === firm.id;

            return (
              <article
                key={firm.id}
                id={firm.id}
                className="min-w-0 scroll-mt-24 overflow-hidden rounded-xl border border-border-theme bg-surface transition-colors hover:border-primary/40"
              >
                <div className="flex min-w-0 items-center gap-2.5 p-3 sm:gap-5 sm:p-5">
                  <FirmLogo
                    firm={firm}
                    className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border-theme bg-surface-secondary text-lg font-black sm:h-16 sm:w-16 sm:text-2xl"
                    style={{
                      color: firm.color,
                    }}
                  />

                  {/* Middle content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <h3 className="text-xs font-extrabold text-foreground sm:text-base">
                        {firm.name}
                      </h3>

                      {firm.discount &&
                        numberValue(firm.discount) > 0 && (
                          <span className="rounded-md bg-rose-500/10 px-1.5 py-0.5 text-[9px] font-bold text-rose-500 sm:text-[10px]">
                            تخفیف {firm.discount}
                          </span>
                        )}
                    </div>

                    <div className="mt-1">
                      <FirmStars rating={firm.rating} />
                    </div>

                    <div className="mt-2 grid grid-cols-3 gap-1 sm:mt-3 sm:gap-3">
                      <div className="min-w-0">
                        <p className="text-[9px] text-muted sm:text-xs">
                          سرمایه
                        </p>
                        <p
                          dir="ltr"
                          className="mt-1 truncate text-left text-[10px] font-bold text-foreground sm:text-sm"
                        >
                          {firm.capital}
                        </p>
                      </div>

                      <div className="min-w-0">
                        <p className="text-[9px] text-muted sm:text-xs">
                          سهم سود
                        </p>
                        <p className="mt-1 text-[10px] font-bold text-foreground sm:text-sm">
                          {firm.profit}
                        </p>
                      </div>

                      <div className="min-w-0">
                        <p className="text-[9px] text-muted sm:text-xs">
                          هزینه چالش
                        </p>
                        <p
                          dir="ltr"
                          className="mt-1 truncate text-left text-[10px] font-bold text-foreground sm:text-sm"
                        >
                          {firm.fee}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action */}
                  <button
                    type="button"
                    onClick={() =>
                      setSelected(
                        expanded ? null : firm.id
                      )
                    }
                    aria-expanded={expanded}
                    aria-controls={`firm-details-${firm.id}`}
                    className="flex h-10 w-[76px] shrink-0 cursor-pointer items-center justify-center gap-1 rounded-lg bg-primary px-2 text-[10px] font-bold text-primary-foreground transition-colors hover:bg-primary-hover sm:h-11 sm:w-[132px] sm:text-xs"
                  >
                    {expanded
                      ? "بستن"
                      : "بررسی کامل"}

                    <ArrowLeft
                      size={13}
                      className="hidden sm:block"
                    />
                  </button>
                </div>

                {/* Expandable firm details */}
                {expanded && (
                  <div
                    id={`firm-details-${firm.id}`}
                    className="border-t border-border-theme bg-surface-secondary/50 p-4 sm:p-6"
                  >
                    <div className="mb-3 flex items-center gap-2 text-sm font-bold">
                      <CheckCircle2
                        size={18}
                        className="text-primary"
                      />
                      درباره {firm.name}
                    </div>

                    <p className="text-xs leading-7 text-muted sm:text-sm">
                      {firm.description}
                    </p>

                    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {[
                        {
                          label: "نوع چالش",
                          value: firm.challenge,
                        },
                        {
                          label: "پرداخت سود",
                          value: firm.payout,
                        },
                        {
                          label: "کد تخفیف",
                          value: firm.code || "ندارد",
                        },
                        {
                          label: "درصد تخفیف",
                          value: firm.discount || "ندارد",
                        },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="min-w-0 rounded-xl border border-border-theme bg-surface p-3"
                        >
                          <p className="text-[11px] text-muted">
                            {item.label}
                          </p>
                          <p className="mt-2 break-words text-xs font-bold text-foreground">
                            {item.value}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <Link
                        href={`/compare?firms=${encodeURIComponent(firm.id)}`}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground"
                      >
                        مقایسه شرکت
                        <ArrowLeft size={15} />
                      </Link>

                      <Link
                        href={`/discounts#${firm.id}`}
                        className="inline-flex items-center gap-2 rounded-lg border border-border-theme bg-surface px-4 py-2.5 text-xs font-semibold text-foreground hover:border-primary"
                      >
                        مشاهده کد تخفیف
                        <ArrowRight size={15} />
                      </Link>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>

        {visibleFirms.length === 0 && (
          <div className="rounded-xl border border-border-theme bg-surface px-5 py-12 text-center">
            <Search
              size={30}
              className="mx-auto text-muted"
            />

            <p className="mt-4 text-sm font-bold">
              شرکتی پیدا نشد
            </p>

            <p className="mt-2 text-xs text-muted">
              عبارت جست‌وجو رو تغییر بده.
            </p>
          </div>
        )}

        <div className="mt-7 rounded-xl border border-border-theme bg-surface-secondary p-4 text-xs leading-7 text-muted">
          اطلاعات شرکت‌ها باید قبل از انتشار با
          قوانین، قیمت‌ها و شرایط رسمی آن‌ها
          تطبیق داده بشه. امتیازهای فعلی، اطلاعات
          ثبت‌شده در پنل سایت هستند.
        </div>
      </section>
    </div>
  );
}
