import Link from "next/link";
import { notFound } from "next/navigation";
import FirmLogo from "@/components/FirmLogo";
import FirmQuestionForm from "@/components/FirmQuestionForm";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getActivePropFirms } from "@/lib/supabase-firms";
import { getPolls } from "@/lib/supabase-polls";

export const dynamic = "force-dynamic";

type Question = { id: string; display_name: string; question: string; created_at: string };

export default async function FirmDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const firms = await getActivePropFirms();
  const firm = firms.find((item) => item.id === id);
  if (!firm) notFound();

  const approved = (await getPolls()).filter((item) => item.firmId === id && item.approved && item.comment.trim());
  const { data: questionRows, error } = await getSupabaseAdmin().from("firm_questions")
    .select("id,display_name,question,created_at").eq("firm_id", id)
    .eq("approved", true).order("created_at", { ascending: false }).limit(100);
  if (error) console.error("Firm questions query failed:", error);
  const questions = (questionRows ?? []) as Question[];
  const summary = [
    ["حداکثر سرمایه", firm.capital], ["سهم سود", firm.profit],
    ["هزینه شروع", firm.fee], ["نوع چالش", firm.challenge],
    ["پرداخت سود", firm.payout], ["امتیاز کاربران", firm.rating],
  ];
  const rules = [
    ["مراحل و نوع چالش", firm.challenge],
    ["حداکثر سرمایه حساب", firm.capital],
    ["شرایط پرداخت سود", firm.payout],
    ["سهم معامله‌گر از سود", firm.profit],
  ];
  return (
    <main dir="rtl" className="page-shell text-foreground">
      <div className="container mx-auto max-w-6xl space-y-8 py-12">
        <section className="rounded-3xl border border-border-theme bg-surface p-6 sm:p-10">
          <p className="mb-4 text-sm text-primary">بررسی تخصصی شرکت پراپ</p>
          <div className="flex flex-wrap items-center gap-5">
            <FirmLogo firm={firm} className="h-20 w-20" />
            <div className="flex-1"><h1 className="text-2xl font-extrabold sm:text-3xl">بررسی کامل {firm.name}</h1>
              <p className="mt-2 text-muted">مشخصات، شرایط، تخفیف و تجربه کاربران</p></div>
          </div>
          <p className="mt-6 leading-9 text-muted">{firm.description}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={`/discounts#${encodeURIComponent(firm.id)}`} className="rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground">مشاهده کد تخفیف</Link>
            <Link href={`/compare?firms=${encodeURIComponent(firm.id)}`} className="rounded-xl border border-border-theme px-5 py-3 font-bold">مقایسه با شرکت‌ها</Link>
            <a href="#discussion" className="rounded-xl border border-border-theme px-5 py-3 font-bold">پرسش و گفت‌وگو</a>
          </div>
        </section>

        <nav aria-label="بخش‌های بررسی" className="flex flex-wrap gap-2 rounded-2xl border border-border-theme bg-surface p-4 text-sm">
          {[["overview", "اطلاعات در یک نگاه"],["plans", "پلن‌ها و قوانین"],["discount", "کد تخفیف"],["discussion", "گفت‌وگوی کاربران"]].map(([anchor, title]) =>
            <a key={anchor} href={`#${anchor}`} className="rounded-lg border border-border-theme px-3 py-2 hover:text-primary">{title}</a>)}
        </nav>

        <section id="overview" className="scroll-mt-24 rounded-3xl border border-border-theme bg-surface p-6 sm:p-8">
          <h2 className="text-2xl font-bold">مهم‌ترین مشخصات {firm.name} در یک نگاه</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {summary.map(([label, value]) => <div key={label} className="rounded-xl border border-border-theme bg-surface-secondary p-5">
              <p className="text-sm text-muted">{label}</p><p className="mt-2 text-lg font-bold">{value || "ثبت نشده"}</p>
            </div>)}
          </div>
        </section>

        <section id="plans" className="scroll-mt-24 rounded-3xl border border-border-theme bg-surface p-6 sm:p-8">
          <h2 className="text-2xl font-bold">پلن‌ها، هزینه‌ها و قوانین معاملاتی</h2>
          <p className="mt-3 text-sm leading-7 text-muted">اطلاعات زیر از داده‌های ثبت‌شده برای همین شرکت نمایش داده می‌شود. جزئیات دراودان روزانه و کلی، قوانین خبر، حداقل روز معاملاتی، ریفاند و برداشت تنها پس از ثبت اطلاعات معتبر توسط مدیر قابل نمایش است؛ پیش از خرید شرایط رسمی شرکت را بررسی کنید.</p>
          <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[440px] text-right text-sm"><tbody>
            {[...rules, ["حداقل هزینه ثبت‌شده", firm.fee]].map(([label, value]) =>
              <tr key={label} className="border-b border-border-theme"><th className="w-1/2 p-4 font-semibold">{label}</th><td className="p-4 text-muted">{value || "ثبت نشده"}</td></tr>)}
          </tbody></table></div>
          <p className="mt-4 text-xs text-muted">هیچ ادعای تأییدنشده‌ای درباره امنیت، مجوز قانونی یا پرداخت‌های شرکت در این صفحه درج نشده است.</p>
        </section>

        <section id="discount" className="scroll-mt-24 rounded-3xl border border-border-theme bg-surface p-6 sm:p-8">
          <h2 className="text-2xl font-bold">کد تخفیف {firm.name}</h2>
          {firm.code ? <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl border border-border-theme bg-surface-secondary p-5">
            <div><p className="text-sm text-muted">تخفیف ثبت‌شده: {firm.discount || "نامشخص"}</p>
              <code className="mt-2 block text-xl font-bold text-foreground" dir="ltr">{firm.code}</code></div>
            <Link className="rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground" href={`/discounts#${encodeURIComponent(firm.id)}`}>مشاهده و کپی کد</Link>
          </div> : <p className="mt-4 text-muted">در حال حاضر کد تخفیفی برای این شرکت ثبت نشده است.</p>}
        </section>

        <section id="discussion" className="scroll-mt-24 rounded-3xl border border-border-theme bg-surface p-6 sm:p-8">
          <h2 className="text-2xl font-bold">پرسش و گفت‌وگوی کاربران درباره {firm.name}</h2>
          <p className="mt-3 text-sm text-muted">پرسش‌ها و تجربه‌های کاربران تنها پس از تأیید مدیر نمایش داده می‌شوند.</p>
          <Link href={`/polls?firm=${encodeURIComponent(firm.id)}`} className="mt-5 inline-flex rounded-xl border border-border-theme px-4 py-3 font-bold">ثبت امتیاز و تجربه</Link>
          <FirmQuestionForm firmId={firm.id} />
          <div className="mt-7 space-y-4">
            {questions.map((q) => <article key={q.id} className="rounded-xl border border-border-theme bg-surface-secondary p-5">
              <p className="font-semibold">{q.display_name || "کاربر سایت"}</p><p className="mt-3 whitespace-pre-wrap leading-8 text-muted">{q.question}</p></article>)}
            {approved.map((poll) => <article key={poll.id} className="rounded-xl border border-border-theme bg-surface-secondary p-5">
              <p className="font-semibold">{poll.displayName || "کاربر سایت"}</p><p className="mt-3 whitespace-pre-wrap leading-8 text-muted">{poll.comment}</p></article>)}
            {!questions.length && !approved.length && <p className="text-muted">هنوز گفت‌وگوی تأییدشده‌ای ثبت نشده است.</p>}
          </div>
        </section>
      </div>
    </main>
  );
}
