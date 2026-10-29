"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageSquareQuote } from "lucide-react";
import type { Firm, Poll } from "@/lib/content";

type Props = { polls: Poll[]; firms: Firm[]; title?: string };

export default function FeaturedReviews({ firms, title = "امتیازدهی به شرکت‌ها" }: Props) {
  const [selected, setSelected] = useState("");
  return (
    <section dir="rtl" aria-label="ثبت نظرسنجی" className="border-t border-border-theme bg-background py-12 sm:py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="mb-6 flex items-center gap-2 text-primary"><MessageSquareQuote size={20} /><h2 className="text-2xl font-extrabold text-foreground">{title}</h2></div>
        <div className="rounded-2xl border border-border-theme bg-surface p-5 sm:p-8">
          <label htmlFor="homepage-poll-firm" className="block font-bold">به کدام شرکت می‌خواهید امتیاز بدهید؟</label>
          <p className="mt-2 text-sm text-muted">شرکت را انتخاب کنید؛ سپس برای ثبت امتیاز و نظر به بخش نظرسنجی بروید.</p>
          <select id="homepage-poll-firm" value={selected} onChange={(event) => setSelected(event.target.value)}
            className="mt-5 h-12 w-full rounded-xl border border-border-theme bg-background px-4 text-foreground">
            <option value="">انتخاب شرکت از لیست</option>
            {firms.map((firm) => <option key={firm.id} value={firm.id}>{firm.name}</option>)}
          </select>
          <Link href={selected ? `/polls?firm=${encodeURIComponent(selected)}` : "/polls"}
            onClick={(event) => { if (!selected) event.preventDefault(); }}
            aria-disabled={!selected}
            className={`mt-4 flex h-12 items-center justify-center rounded-xl text-sm font-bold ${selected ? "bg-primary text-primary-foreground" : "cursor-not-allowed bg-surface-secondary text-muted"}`}>
            ادامه و ثبت امتیاز و نظر
          </Link>
          {firms.length === 0 && <p className="mt-3 text-sm text-muted">هنوز شرکتی برای نظرسنجی موجود نیست.</p>}
        </div>
      </div>
    </section>
  );
}
