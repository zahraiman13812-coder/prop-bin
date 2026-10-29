
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Entry = {
  id: string;
  userId: string;
  name: string;
  email: string;
  code: string;
  period: string;
  createdAt: string;
  selectable?: boolean;
};

type Winner = Entry & {
  selectedAt: string;
};

type Lottery = {
  enabled: boolean;
  title: string;
  description: string;
  articleSlug: string;
  period: string;
  entries: Entry[];
  winners: Winner[];
};

type ArticleOption = {
  slug: string;
  title: string;
};

type ApiData = {
  lottery?: Lottery;
  articles?: ArticleOption[];
  error?: string;
};

export default function AdminLotteryPage() {
  const [lottery, setLottery] = useState<Lottery | null>(
    null
  );

  const [articles, setArticles] = useState<
    ArticleOption[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectingWinner, setSelectingWinner] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/admin/lottery",
        {
          credentials: "same-origin",
          cache: "no-store",
        }
      );

      const data = (await response.json()) as ApiData;

      if (!response.ok || !data.lottery) {
        throw new Error(
          data.error || "دریافت تنظیمات ناموفق بود."
        );
      }

      setLottery(data.lottery);

      setArticles(
        Array.isArray(data.articles)
          ? data.articles
          : []
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "خطا در دریافت اطلاعات."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function update<K extends keyof Lottery>(
    key: K,
    value: Lottery[K]
  ) {
    setLottery((current) =>
      current
        ? {
            ...current,
            [key]: value,
          }
        : current
    );

    setMessage("");
    setError("");
  }

  async function save() {
    if (!lottery || saving) return;

    if (!lottery.title.trim()) {
      setError("عنوان قرعه‌کشی الزامی است.");
      return;
    }

    if (!lottery.period.trim()) {
      setError("نام دوره الزامی است.");
      return;
    }

    if (
      lottery.enabled &&
      !lottery.articleSlug
    ) {
      setError(
        "برای فعال‌کردن قرعه‌کشی باید یک مقاله منتشرشده انتخاب کنید."
      );
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        "/api/admin/lottery",
        {
          method: "PUT",
          credentials: "same-origin",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            enabled: lottery.enabled,
            title: lottery.title,
            description: lottery.description,
            articleSlug: lottery.articleSlug,
            period: lottery.period,
          }),
        }
      );

      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || data.ok !== true) {
        throw new Error(
          data.error || "ذخیره تنظیمات ناموفق بود."
        );
      }

      setMessage(
        "تنظیمات قرعه‌کشی با موفقیت ذخیره شد."
      );

      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "خطا در ذخیره تنظیمات."
      );
    } finally {
      setSaving(false);
    }
  }

  async function selectWinner(entry: Entry) {
    if (!entry.selectable || selectingWinner) return;

    const currentWinner = lottery?.winners.find(
      (winner) => winner.period === entry.period
    );

    if (currentWinner?.id === entry.id) return;

    if (
      currentWinner &&
      !window.confirm(
        `برای دوره «${entry.period}» قبلاً ${currentWinner.name} برنده شده است. برنده را با ${entry.name} جایگزین می‌کنید؟`
      )
    ) {
      return;
    }

    setSelectingWinner(entry.id);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/lottery", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: entry.id, period: entry.period }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || data.ok !== true) {
        throw new Error(data.error || "ثبت برنده ناموفق بود.");
      }

      setMessage(`برنده دوره «${entry.period}» با موفقیت ثبت و اعلام شد.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ثبت برنده ناموفق بود.");
    } finally {
      setSelectingWinner(null);
    }
  }

  const inputClass =
    "w-full min-w-0 rounded-xl border border-border-theme bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary";

  return (
    <main
      dir="rtl"
      className="w-full min-w-0 space-y-6 text-foreground"
    >
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-extrabold">
            قرعه‌کشی مقاله‌ای
          </h1>

          <p className="mt-2 text-sm leading-7 text-muted">
            مدیریت دوره‌ها، مقاله مرتبط و کدهای
            شرکت‌کنندگان
          </p>
        </div>

        <Link
          href="/lottery"
          className="rounded-xl border border-border-theme bg-surface px-5 py-3 text-center text-sm font-bold"
        >
          مشاهده صفحه عمومی
        </Link>
      </header>

      {error && (
        <p
          role="alert"
          className="rounded-xl bg-red-500/10 p-4 text-sm text-red-500"
        >
          {error}
        </p>
      )}

      {message && (
        <p
          role="status"
          className="rounded-xl bg-green-500/10 p-4 text-sm text-green-600"
        >
          {message}
        </p>
      )}

      {loading && !lottery ? (
        <p className="rounded-2xl border border-border-theme bg-surface p-6 text-sm text-muted">
          در حال دریافت تنظیمات قرعه‌کشی...
        </p>
      ) : lottery ? (
        <>
          <section className="space-y-5 rounded-2xl border border-border-theme bg-surface p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-extrabold">
                تنظیمات قرعه‌کشی
              </h2>

              <span className="text-xs text-muted">
                {articles.length.toLocaleString(
                  "fa-IR"
                )}{" "}
                مقاله منتشرشده
              </span>
            </div>

            <label className="flex items-center gap-3 rounded-xl border border-border-theme bg-background p-4">
              <input
                type="checkbox"
                checked={lottery.enabled}
                onChange={(event) =>
                  update(
                    "enabled",
                    event.target.checked
                  )
                }
                className="h-5 w-5 shrink-0 accent-primary"
              />

              <span className="text-sm font-bold">
                قرعه‌کشی فعال باشد
              </span>
            </label>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <label className="block min-w-0 space-y-2">
                <span className="text-sm font-bold">
                  عنوان قرعه‌کشی
                </span>

                <input
                  type="text"
                  maxLength={120}
                  value={lottery.title}
                  onChange={(event) =>
                    update(
                      "title",
                      event.target.value
                    )
                  }
                  className={inputClass}
                />
              </label>

              <label className="block min-w-0 space-y-2">
                <span className="text-sm font-bold">
                  نام دوره
                </span>

                <input
                  type="text"
                  maxLength={100}
                  value={lottery.period}
                  onChange={(event) =>
                    update(
                      "period",
                      event.target.value
                    )
                  }
                  className={inputClass}
                />

                <span className="block text-xs leading-6 text-muted">
                  برای شروع دوره جدید، نام تازه‌ای
                  انتخاب کن. کدهای دوره‌های قبلی
                  حفظ می‌شوند.
                </span>
              </label>

              <label className="block min-w-0 space-y-2 md:col-span-2">
                <span className="text-sm font-bold">
                  توضیحات
                </span>

                <textarea
                  rows={3}
                  maxLength={800}
                  value={lottery.description}
                  onChange={(event) =>
                    update(
                      "description",
                      event.target.value
                    )
                  }
                  className={inputClass}
                />
              </label>

              <label className="block min-w-0 space-y-2 md:col-span-2">
                <span className="text-sm font-bold">
                  مقاله قرعه‌کشی
                </span>

                <select
                  value={lottery.articleSlug}
                  onChange={(event) =>
                    update(
                      "articleSlug",
                      event.target.value
                    )
                  }
                  className={inputClass}
                >
                  <option value="">
                    انتخاب مقاله منتشرشده
                  </option>

                  {lottery.articleSlug &&
                    !articles.some(
                      (article) =>
                        article.slug ===
                        lottery.articleSlug
                    ) && (
                      <option
                        value={lottery.articleSlug}
                        disabled
                      >
                        مقاله قبلی در فهرست انتشار
                        نیست
                      </option>
                    )}

                  {articles.map((article) => (
                    <option
                      key={article.slug}
                      value={article.slug}
                    >
                      {article.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {articles.length === 0 && (
              <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-7">
                هیچ مقاله منتشرشده‌ای
                دریافت نشده است. ابتدا در مدیریت
                مقالات یک مقاله را منتشر کن؛ تا
                آن زمان قرعه‌کشی را فعال نکن.
              </p>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={save}
                disabled={
                  saving ||
                  loading ||
                  (lottery.enabled &&
                    !articles.some(
                      (article) =>
                        article.slug ===
                        lottery.articleSlug
                    ))
                }
                className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "در حال ذخیره..."
                  : "ذخیره تنظیمات"}
              </button>

              <button
                type="button"
                onClick={() => void load()}
                disabled={loading || saving}
                className="rounded-xl border border-border-theme px-6 py-3 text-sm font-bold disabled:opacity-50"
              >
                دریافت مجدد اطلاعات
              </button>
            </div>
          </section>

          <section className="min-w-0 rounded-2xl border border-border-theme bg-surface p-4 sm:p-6">
            <h2 className="mb-2 text-lg font-extrabold">
              شرکت‌کنندگان
            </h2>

            <p className="mb-5 text-sm text-muted">
              {lottery.entries.length.toLocaleString(
                "fa-IR"
              )}{" "}
              کد ثبت‌شده در تمام دوره‌ها
            </p>

            {lottery.winners.length > 0 && (
              <div className="mb-6 space-y-3">
                <h3 className="font-bold">برندگان اعلام‌شده</h3>
                {lottery.winners.map((winner) => (
                  <div key={winner.period} className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                      <div className="space-y-1">
                        <p className="font-extrabold">{winner.name} <span className="text-xs font-medium text-muted">— {winner.period}</span></p>
                        <p dir="ltr" className="text-left text-sm text-muted">{winner.email}</p>
                        <p dir="ltr" className="font-mono text-xs">{winner.code}</p>
                      </div>
                      <p className="text-xs text-muted">اعلام: {new Date(winner.selectedAt).toLocaleString("fa-IR")}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="max-w-full overflow-x-auto">
              <table className="w-full min-w-[980px] text-right text-sm">
                <thead>
                  <tr className="border-b border-border-theme text-muted">
                    <th className="p-3">نام</th>
                    <th className="p-3">ایمیل</th>
                    <th className="p-3">کد</th>
                    <th className="p-3">دوره</th>
                    <th className="p-3">تاریخ</th>
                    <th className="p-3">وضعیت</th>
                    <th className="p-3">عملیات مدیر</th>
                  </tr>
                </thead>

                <tbody>
                  {lottery.entries.map((entry) => (
                    <tr
                      key={entry.id}
                      className="border-b border-border-theme"
                    >
                      <td className="p-3">
                        {entry.name}
                      </td>

                      <td
                        dir="ltr"
                        className="p-3 text-left"
                      >
                        {entry.email}
                      </td>

                      <td
                        dir="ltr"
                        className="p-3 font-mono text-xs"
                      >
                        {entry.code}
                      </td>

                      <td className="p-3">
                        {entry.period}
                      </td>

                      <td className="whitespace-nowrap p-3">
                        {new Date(
                          entry.createdAt
                        ).toLocaleString("fa-IR")}
                      </td>

                      <td className="p-3">
                        {lottery.winners.some((winner) => winner.id === entry.id && winner.period === entry.period) ? (
                          <span className="font-bold text-emerald-600">برنده اعلام‌شده</span>
                        ) : lottery.winners.some((winner) => winner.period === entry.period) ? (
                          <span className="text-muted">برنده این دوره انتخاب شده</span>
                        ) : (
                          <span className="text-muted">در انتظار انتخاب</span>
                        )}
                      </td>

                      <td className="p-3">
                        {entry.selectable ? (
                          lottery.winners.some((winner) => winner.id === entry.id && winner.period === entry.period) ? (
                            <button type="button" disabled className="rounded-lg border border-emerald-500/40 px-3 py-2 text-xs font-bold text-emerald-600 disabled:opacity-70">برنده فعلی</button>
                          ) : (
                            <button type="button" onClick={() => void selectWinner(entry)} disabled={selectingWinner !== null || loading} className="whitespace-nowrap rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
                              {selectingWinner === entry.id ? "در حال ثبت..." : "انتخاب و اعلام برنده"}
                            </button>
                          )
                        ) : (
                          <span className="text-xs text-muted">کد قدیمی؛ نیازمند انتقال است</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {lottery.entries.length === 0 && (
              <p className="py-8 text-center text-sm text-muted">
                هنوز هیچ کد شرکتی صادر نشده است.
              </p>
            )}
          </section>
        </>
      ) : (
        <p className="text-sm text-muted">
          دریافت اطلاعات امکان‌پذیر نبود.
        </p>
      )}
    </main>
  );
}
