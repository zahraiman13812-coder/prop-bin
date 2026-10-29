
"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import Link from "next/link";
import {
  MessageSquareQuote,
  Star,
} from "lucide-react";

import type {
  Firm,
  Poll,
} from "@/lib/content";

type Props = {
  polls: Poll[];
  firms: Firm[];
  title?: string;
};

export default function FeaturedReviews({
  polls,
  firms,
  title = "تریدرها چه می‌گویند؟",
}: Props) {
  const reviews = polls
    .filter(
      (poll) =>
        poll.approved &&
        poll.featured &&
        Boolean(poll.comment?.trim())
    )
    .slice(0, 12);

  const trackRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(0);
  const pausedRef = useRef(false);

  const [active, setActive] = useState(0);
  const [selectedFirmId, setSelectedFirmId] = useState("");

  // Move only the horizontal carousel.
  // Never call scrollIntoView, because it
  // can move the entire document vertically.
  const goTo = useCallback((index: number) => {
    const track = trackRef.current;
    if (!track) return;

    const cards = Array.from(
      track.querySelectorAll<HTMLElement>(
        "[data-review-card]"
      )
    );

    if (!cards.length) return;

    const target =
      ((index % cards.length) + cards.length) %
      cards.length;

    const cardRect =
      cards[target].getBoundingClientRect();

    const trackRect =
      track.getBoundingClientRect();

    // Works with RTL layouts too.
    const delta =
      cardRect.right - trackRect.right;

    track.scrollBy({
      left: delta,
      behavior: "smooth",
    });

    activeRef.current = target;
    setActive(target);
  }, []);

  const updateActive = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;

    const cards = Array.from(
      track.querySelectorAll<HTMLElement>(
        "[data-review-card]"
      )
    );

    if (!cards.length) return;

    const right =
      track.getBoundingClientRect().right;

    let closest = 0;
    let distance = Infinity;

    cards.forEach((card, index) => {
      const current = Math.abs(
        card.getBoundingClientRect().right - right
      );

      if (current < distance) {
        distance = current;
        closest = index;
      }
    });

    activeRef.current = closest;
    setActive(closest);
  }, []);

  // Automatically change review every 5 sec.
  useEffect(() => {
    if (reviews.length < 2) return;

    const timer = window.setInterval(() => {
      if (
        pausedRef.current ||
        document.hidden ||
        window.matchMedia(
          "(prefers-reduced-motion: reduce)"
        ).matches
      ) {
        return;
      }

      goTo(
        (activeRef.current + 1) % reviews.length
      );
    }, 5000);

    return () => {
      window.clearInterval(timer);
    };
  }, [reviews.length, goTo]);

  useEffect(() => {
    activeRef.current = 0;
    setActive(0);
  }, [polls]);

  return (
    <section
      dir="rtl"
      aria-label="نظرات منتخب کاربران"
      className="overflow-hidden border-t border-border-theme bg-background py-12 sm:py-16"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        {/* Section heading */}
        <div className="mb-7">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold text-primary">
            <MessageSquareQuote size={18} />
            تجربه کاربران پراپ بین
          </div>

          <h2 className="text-2xl font-extrabold text-foreground sm:text-3xl">
            {title}
          </h2>

          <p className="mt-3 text-sm text-muted">
            تجربه‌های واقعی و تأییدشده کاربران
          </p>
        </div>

        <div className="mb-8 rounded-2xl border border-border-theme bg-surface p-5 sm:p-6">
          <h3 className="text-lg font-bold text-foreground">به کدام شرکت امتیاز می‌دهید؟</h3>
          <p className="mt-2 text-sm text-muted">
            شرکت موردنظر را انتخاب کنید؛ پس از ورود، فرم نظرسنجی همان شرکت باز می‌شود.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <select
              aria-label="انتخاب شرکت برای نظرسنجی"
              value={selectedFirmId}
              onChange={(event) => setSelectedFirmId(event.target.value)}
              className="h-12 w-full flex-1 rounded-xl border border-border-theme bg-background px-4 text-foreground"
            >
              <option value="">شرکت پراپ را انتخاب کنید</option>
              {firms.map((firm) => (
                <option key={firm.id} value={firm.id}>{firm.name}</option>
              ))}
            </select>
            <Link
              href={selectedFirmId ? `/polls?firm=${encodeURIComponent(selectedFirmId)}` : "/polls"}
              aria-disabled={!selectedFirmId}
              onClick={(event) => { if (!selectedFirmId) event.preventDefault(); }}
              className={`inline-flex h-12 items-center justify-center rounded-xl px-6 text-sm font-bold ${selectedFirmId ? "bg-primary text-primary-foreground" : "cursor-not-allowed bg-surface-secondary text-muted"}`}
            >
              ادامه و ثبت نظر
            </Link>
          </div>
          {firms.length === 0 && <p className="mt-3 text-sm text-muted">هنوز شرکتی برای نظرسنجی ثبت نشده است.</p>}
        </div>
        {reviews.length > 0 && (
          <>
        {/* Horizontal, touch-enabled slider */}
        <div
          ref={trackRef}
          dir="rtl"
          onScroll={updateActive}
          onMouseEnter={() => {
            pausedRef.current = true;
          }}
          onMouseLeave={() => {
            pausedRef.current = false;
          }}
          onPointerDown={() => {
            pausedRef.current = true;
          }}
          onPointerUp={() => {
            pausedRef.current = false;
          }}
          onPointerCancel={() => {
            pausedRef.current = false;
          }}
          onFocusCapture={() => {
            pausedRef.current = true;
          }}
          onBlurCapture={(event) => {
            if (
              !event.currentTarget.contains(
                event.relatedTarget as Node | null
              )
            ) {
              pausedRef.current = false;
            }
          }}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto overflow-y-hidden scroll-smooth overscroll-x-contain pb-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{
            WebkitOverflowScrolling: "touch",
          }}
        >
          {reviews.map((poll) => {
            const firm = firms.find(
              (item) => item.id === poll.firmId
            );

            const average =
              (
                poll.trust +
                poll.support +
                poll.payout +
                poll.rules
              ) / 4;

            const name =
              poll.displayName?.trim() ||
              "کاربر پراپ بین";

            return (
              <article
                key={poll.id}
                data-review-card
                className="flex min-w-0 shrink-0 basis-[88%] snap-start flex-col rounded-2xl border border-border-theme bg-surface p-5 sm:basis-[calc(50%-8px)] lg:basis-[calc(33.333%-11px)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-primary">
                    {firm?.name || "شرکت پراپ"}
                  </span>

                  <MessageSquareQuote
                    size={22}
                    className="text-primary/40"
                  />
                </div>

                {/* Rating */}
                <div className="mt-4 flex gap-1">
                  {[1, 2, 3, 4, 5].map(
                    (number) => (
                      <Star
                        key={number}
                        size={17}
                        className={
                          number <= Math.round(average)
                            ? "fill-amber-400 text-amber-400"
                            : "fill-none text-muted"
                        }
                      />
                    )
                  )}
                </div>

                {/* Review text */}
                <p className="mt-5 flex-1 whitespace-pre-wrap break-words text-sm leading-8 text-foreground">
                  «{poll.comment}»
                </p>

                {/* Reviewer */}
                <div className="mt-6 flex items-center gap-3 border-t border-border-theme pt-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                    {name.slice(0, 1)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground">
                      {name}
                    </p>

                    <p className="mt-1 text-xs text-muted">
                      نظر تأییدشده
                    </p>
                  </div>

                  <span className="text-xs font-bold text-primary">
                    {average.toFixed(1)} / ۵
                  </span>
                </div>
              </article>
            );
          })}
        </div>

        {/* Dots instead of arrow buttons */}
        {reviews.length > 1 && (
          <div
            role="group"
            aria-label="انتخاب نظر"
            className="mt-3 flex flex-wrap items-center justify-center gap-2"
          >
            {reviews.map((poll, index) => (
              <button
                key={poll.id}
                type="button"
                onClick={() => goTo(index)}
                aria-label={`نمایش نظر ${index + 1}`}
                aria-current={
                  active === index
                    ? "true"
                    : undefined
                }
                className={`h-2 rounded-full transition-all duration-300 ${
                  active === index
                    ? "w-7 bg-primary"
                    : "w-2 bg-muted/40 hover:bg-primary/40"
                }`}
              />
            ))}
          </div>
        )}

        <div className="mt-7 text-center">
          <Link
            href="/polls"
            className="text-sm font-semibold text-primary hover:underline"
          >
            مشاهده همه نظرسنجی‌ها ←
          </Link>
        </div>
          </>
        )}
      </div>
    </section>
  );
}
