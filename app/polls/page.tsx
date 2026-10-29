
"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import {
  CheckCircle2,
  Headphones,
  LogIn,
  MessageSquare,
  Search,
  ShieldCheck,
  Star,
  Wallet,
  Scale,
} from "lucide-react";

type Firm = {
  id: string;
  name: string;
  color: string;
  description: string;
};

type Vote = {
  id: string;
  firmId: string;
  trust: number;
  support: number;
  payout: number;
  rules: number;
  approved: boolean;
  comment: string;
};

type Scores = {
  trust: number;
  support: number;
  payout: number;
  rules: number;
};

const emptyScores: Scores = {
  trust: 0,
  support: 0,
  payout: 0,
  rules: 0,
};

const criteria = [
  {
    key: "trust",
    title: "اعتبار شرکت",
    icon: ShieldCheck,
  },
  {
    key: "support",
    title: "پشتیبانی",
    icon: Headphones,
  },
  {
    key: "payout",
    title: "برداشت سود",
    icon: Wallet,
  },
  {
    key: "rules",
    title: "قوانین شرکت",
    icon: Scale,
  },
] as const;

function Stars({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div
      role="group"
      aria-label="انتخاب امتیاز"
      className="flex items-center gap-1"
    >
      {[1, 2, 3, 4, 5].map((number) => (
        <button
          key={number}
          type="button"
          aria-label={`${number} ستاره`}
          aria-pressed={value === number}
          onClick={() => onChange(number)}
          className="inline-flex cursor-pointer items-center justify-center border-0 bg-transparent p-0.5 shadow-none outline-none transition-transform hover:scale-110 focus-visible:rounded focus-visible:outline-2 focus-visible:outline-primary"
        >
          <Star
            size={24}
            className={
              number <= value
                ? "fill-amber-400 text-amber-400"
                : "fill-none text-muted"
            }
          />
        </button>
      ))}
    </div>
  );
}

export default function PollsPage() {
  const [firms, setFirms] = useState<Firm[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [myVotes, setMyVotes] = useState<Vote[]>([]);
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [scores, setScores] = useState<Scores>({
    ...emptyScores,
  });
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const [contentResult, votesResult, sessionResult] =
      await Promise.all([
        fetch("/api/content", {
          cache: "no-store",
        }),
        fetch("/api/polls", {
          cache: "no-store",
        }),
        fetch("/api/user/session", {
          cache: "no-store",
        }),
      ]);

    if (
      !contentResult.ok ||
      !votesResult.ok ||
      !sessionResult.ok
    ) {
      throw new Error(
        "دریافت اطلاعات نظرسنجی ناموفق بود."
      );
    }

    const content = await contentResult.json();
    const publicVotes = await votesResult.json();
    const session = await sessionResult.json();

    setFirms(content.firms || []);
    setVotes(publicVotes.polls || []);

    if (session.user) {
      setSignedIn(true);

      const mine = await fetch(
        "/api/polls?mine=1",
        { cache: "no-store" }
      );

      if (mine.ok) {
        const result = await mine.json();
        setMyVotes(result.polls || []);
      }
    } else {
      setSignedIn(false);
      setMyVotes([]);
    }
  }

  useEffect(() => {
    load()
      .catch((err) => {
        setError(
          err instanceof Error
            ? err.message
            : "خطا در بارگذاری"
        );
      })
      .finally(() => setLoading(false));
  }, []);

  function openForm(firmId: string) {
    setSelected(
      selected === firmId ? null : firmId
    );
    setScores({ ...emptyScores });
    setComment("");
    setError("");
    setMessage("");
  }

  async function submitVote(firmId: string) {
    if (saving) return;

    if (
      Object.values(scores).some(
        (score) => score < 1
      )
    ) {
      setError(
        "لطفاً به هر چهار معیار امتیاز بده."
      );
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        "/api/polls",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            firmId,
            ...scores,
            comment,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "ثبت نظر انجام نشد."
        );
      }

      await load();
      setSelected(null);
      setScores({ ...emptyScores });
      setComment("");
      setMessage(result.message);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "خطا در ثبت نظر"
      );
    } finally {
      setSaving(false);
    }
  }

  const filteredFirms = firms.filter((firm) =>
    firm.name
      .toLocaleLowerCase()
      .includes(search.trim().toLocaleLowerCase())
  );

  function firmStats(firmId: string) {
    const list = votes.filter(
      (vote) => vote.firmId === firmId
    );

    if (!list.length) {
      return { count: 0, average: 0 };
    }

    const total = list.reduce(
      (sum, vote) =>
        sum +
        (vote.trust +
          vote.support +
          vote.payout +
          vote.rules) /
          4,
      0
    );

    return {
      count: list.length,
      average: total / list.length,
    };
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-background text-foreground"
    >
      <section className="border-b border-border-theme bg-surface px-4 py-12 text-center sm:py-16">
        <div className="mx-auto max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-xs font-bold text-primary">
            <MessageSquare size={16} />
            تجربه تریدرها
          </div>

          <h1 className="text-3xl font-extrabold sm:text-4xl">
            نظرسنجی <span className="text-primary">پراپ‌ها</span>
          </h1>

          <p className="mt-4 text-sm leading-8 text-muted">
            تجربه‌ات از شرکت‌های پراپ رو ثبت کن
            و به انتخاب بهتر سایر تریدرها کمک کن.
          </p>

          {!signedIn && !loading && (
            <Link
              href="/login"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground"
            >
              <LogIn size={18} />
              ورود برای ثبت نظر
            </Link>
          )}
        </div>
      </section>

      <main className="mx-auto max-w-[1100px] px-4 py-10 sm:px-6">
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold sm:text-2xl">
              امتیازدهی به شرکت‌ها
            </h2>
            <p className="mt-2 text-xs text-muted">
              امتیازها پس از بررسی مدیر منتشر می‌شوند.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search
              size={18}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="جست‌وجوی پراپ..."
              className="h-11 w-full rounded-xl border border-border-theme bg-surface pr-10 pl-3 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>
        </div>

        {message && (
          <p
            role="status"
            className="mb-5 rounded-xl bg-success/10 p-4 text-sm text-success"
          >
            {message}
          </p>
        )}

        {error && (
          <p
            role="alert"
            className="mb-5 rounded-xl bg-danger/10 p-4 text-sm text-danger"
          >
            {error}
          </p>
        )}

        {loading ? (
          <p className="py-12 text-center text-muted">
            در حال دریافت اطلاعات...
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredFirms.map((firm) => {
              const stats = firmStats(firm.id);
              const voted = myVotes.some(
                (vote) => vote.firmId === firm.id
              );
              const active = selected === firm.id;

              return (
                <article
                  key={firm.id}
                  className="min-w-0 overflow-hidden rounded-2xl border border-border-theme bg-surface"
                >
                  <div className="p-5">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-secondary text-xl font-extrabold"
                        style={{
                          color: firm.color,
                        }}
                      >
                        {firm.name.slice(0, 1)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold">
                          {firm.name}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-xs text-muted">
                          {firm.description}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between rounded-xl bg-surface-secondary p-4">
                      <div>
                        <p className="text-xl font-bold">
                          {stats.average.toLocaleString(
                            "fa-IR",
                            {
                              maximumFractionDigits: 1,
                            }
                          )}
                          <span className="text-xs text-muted">
                            {" "}از ۵
                          </span>
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          {stats.count.toLocaleString("fa-IR")} رأی تأییدشده
                        </p>
                      </div>

                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(
                          (number) => (
                            <Star
                              key={number}
                              size={17}
                              className={
                                number <=
                                Math.round(stats.average)
                                  ? "fill-amber-400 text-amber-400"
                                  : "fill-none text-muted"
                              }
                            />
                          )
                        )}
                      </div>
                    </div>

                    {voted ? (
                      <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-success/10 p-3 text-sm text-success">
                        <CheckCircle2 size={18} />
                        نظر شما ثبت شده
                      </div>
                    ) : signedIn ? (
                      <button
                        type="button"
                        onClick={() =>
                          openForm(firm.id)
                        }
                        aria-expanded={active}
                        className="mt-4 h-11 w-full rounded-xl bg-primary text-sm font-bold text-primary-foreground"
                      >
                        {active
                          ? "بستن فرم"
                          : "ثبت امتیاز و نظر"}
                      </button>
                    ) : (
                      <Link
                        href="/login"
                        className="mt-4 flex h-11 items-center justify-center rounded-xl border border-border-theme text-sm font-semibold text-primary"
                      >
                        ورود برای امتیازدهی
                      </Link>
                    )}
                  </div>

                  {active && signedIn && !voted && (
                    <div className="space-y-5 border-t border-border-theme bg-background/40 p-5">
                      {criteria.map(
                        ({ key, title, icon: Icon }) => (
                          <div
                            key={key}
                            className="flex flex-wrap items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-2 text-sm font-semibold">
                              <Icon
                                size={18}
                                className="text-primary"
                              />
                              {title}
                            </div>

                            <Stars
                              value={scores[key]}
                              onChange={(value) =>
                                setScores((prev) => ({
                                  ...prev,
                                  [key]: value,
                                }))
                              }
                            />
                          </div>
                        )
                      )}

                      <div>
                        <label
                          htmlFor={`comment-${firm.id}`}
                          className="mb-2 block text-sm font-semibold"
                        >
                          تجربه شما (اختیاری)
                        </label>

                        <textarea
                          id={`comment-${firm.id}`}
                          rows={4}
                          maxLength={500}
                          value={comment}
                          onChange={(event) =>
                            setComment(event.target.value)
                          }
                          placeholder="تجربه خودت رو بنویس..."
                          className="w-full rounded-xl border border-border-theme bg-surface p-3 text-sm text-foreground outline-none focus:border-primary"
                        />

                        <p className="mt-1 text-left text-xs text-muted">
                          {comment.length}/500
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={saving}
                        onClick={() =>
                          submitVote(firm.id)
                        }
                        className="h-11 w-full rounded-xl bg-primary text-sm font-bold text-primary-foreground disabled:opacity-50"
                      >
                        {saving
                          ? "در حال ثبت..."
                          : "ثبت نهایی نظر"}
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {!loading && filteredFirms.length === 0 && (
          <p className="rounded-xl border border-border-theme bg-surface p-8 text-center text-muted">
            شرکتی پیدا نشد.
          </p>
        )}

        <div className="mt-8 rounded-xl border border-border-theme bg-surface-secondary p-5 text-xs leading-8 text-muted">
          امتیازها نشان‌دهنده تجربه کاربران هستند
          و به معنی تأیید یا تضمین عملکرد شرکت‌ها
          از طرف پراپ بین نیستند.
        </div>
      </main>
    </div>
  );
}
