import { firmSpecificationFields } from "@/lib/firm-specifications";
import Link from "next/link";
import { notFound } from "next/navigation";
import FirmLogo from "@/components/FirmLogo";
import FirmQuestionForm from "@/components/FirmQuestionForm";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getActivePropFirms } from "@/lib/supabase-firms";
import { getPolls } from "@/lib/supabase-polls";
import { getFirmDetails } from "@/lib/firm-details";

export const dynamic = "force-dynamic";

type Question = { id: string; display_name: string; question: string; created_at: string };

export default async function FirmDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const firms = await getActivePropFirms();
  const firm = firms.find((item) => item.id === id);
  if (!firm) notFound();

  const details = await getFirmDetails(id);
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
          {[["overview", "اطلاعات در یک نگاه"],["introduction", "معرفی و اعتبار"],["plans", "پلن‌ها و قوانین"],["rules", "قوانین و برداشت"],["pros-cons", "مزایا و معایب"],["discount", "کد تخفیف"],["faq", "سوالات متداول"],["discussion", "گفت‌وگوی کاربران"]].map(([anchor, title]) =>
            <a key={anchor} href={`#${anchor}`} className="rounded-lg border border-border-theme px-3 py-2 hover:text-primary">{title}</a>)}
        </nav>

        <section id="overview" className="scroll-mt-24 rounded-3xl border border-border-theme bg-surface p-6 sm:p-8">
          <h2 className="text-2xl font-bold">مهم‌ترین مشخصات {firm.name} در یک نگاه</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[...summary, ...details.facts.map(item=>[item.label,item.value])].map(([label, value]) => <div key={label} className="rounded-xl border border-border-theme bg-surface-secondary p-5">
              <p className="text-sm text-muted">{label}</p><p className="mt-2 text-lg font-bold">{value || "ثبت نشده"}</p>
            </div>)}
          </div>
        </section>

        <section id="introduction" className="scroll-mt-24 rounded-3xl border border-border-theme bg-surface p-6 sm:p-8">
          <h2 className="text-2xl font-bold">معرفی و اعتبار {firm.name}</h2>
          <p className="mt-4 whitespace-pre-line leading-9 text-muted">{details.introduction || firm.description || "توضیح تکمیلی هنوز توسط مدیر ثبت نشده است."}</p>
          {details.history && <><h3 className="mt-7 text-xl font-bold">سابقه و وضعیت شرکت</h3><p className="mt-3 whitespace-pre-line leading-9 text-muted">{details.history}</p></>}
        </section>

        <section id="plans" className="scroll-mt-24 rounded-3xl border border-border-theme bg-surface p-6 sm:p-8">
          <h2 className="text-2xl font-bold">پلن‌ها، هزینه‌ها و قوانین معاملاتی</h2>
          <p className="mt-3 text-sm leading-7 text-muted">اطلاعات زیر از داده‌های ثبت‌شده برای همین شرکت نمایش داده می‌شود. جزئیات دراودان روزانه و کلی، قوانین خبر، حداقل روز معاملاتی، ریفاند و برداشت تنها پس از ثبت اطلاعات معتبر توسط مدیر قابل نمایش است؛ پیش از خرید شرایط رسمی شرکت را بررسی کنید.</p>
          <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[440px] text-right text-sm"><tbody>
            {[...rules, ["حداقل هزینه ثبت‌شده", firm.fee]].map(([label, value]) =>
              <tr key={label} className="border-b border-border-theme"><th className="w-1/2 p-4 font-semibold">{label}</th><td className="p-4 text-muted">{value || "ثبت نشده"}</td></tr>)}
          </tbody></table></div>
          {details.plans.length>0 && <div className="mt-7 overflow-x-auto"><h3 className="mb-4 text-xl font-bold">قیمت و مشخصات پلن‌های معاملاتی</h3><table className="w-full min-w-[720px] text-right text-sm"><thead className="bg-surface-secondary"><tr>{["پلن","اندازه حساب","قیمت","هدف سود","افت روزانه","افت کل"].map(x=><th key={x} className="p-3">{x}</th>)}</tr></thead><tbody>{details.plans.map((p,i)=><tr key={i} className="border-b border-border-theme">{[p.name,p.size,p.price,p.target,p.dailyLoss,p.maxLoss].map((v,j)=><td key={j} className="p-3">{v||"—"}</td>)}</tr>)}</tbody></table></div>}
          <p className="mt-4 text-xs text-muted">هیچ ادعای تأییدنشده‌ای درباره امنیت، مجوز قانونی یا پرداخت‌های شرکت در این صفحه درج نشده است.</p>
        </section>

        <section id="specifications" className="rounded-3xl border border-border-theme bg-surface p-5 sm:p-8"><h2 className="mb-5 text-xl font-bold">مشخصات کامل و قوانین شرکت</h2><div className="grid gap-3 md:grid-cols-2">{firmSpecificationFields.map(field=><div key={field.key} className="min-w-0 rounded-xl border border-border-theme p-4"><p className="text-xs text-muted">{field.label}</p><p className="mt-2 break-words text-sm font-semibold">{details.specifications?.[field.key]||"ثبت نشده"}</p></div>)}</div></section>
        <section id="rules" className="scroll-mt-24 rounded-3xl border border-border-theme bg-surface p-6 sm:p-8"><h2 className="text-2xl font-bold">قوانین و شرایط برداشت سود</h2><h3 className="mt-5 font-bold">قوانین معاملاتی</h3><p className="mt-3 whitespace-pre-line leading-9 text-muted">{details.tradingRules||"قوانین تکمیلی هنوز ثبت نشده است؛ شرایط رسمی شرکت را بررسی کنید."}</p><h3 className="mt-6 font-bold">برداشت سود و بازگشت وجه</h3><p className="mt-3 whitespace-pre-line leading-9 text-muted">{details.payoutRules||"جزئیات برداشت هنوز ثبت نشده است."}</p></section>
        <section id="pros-cons" className="scroll-mt-24 grid gap-4 md:grid-cols-2"><div className="rounded-3xl border border-border-theme bg-surface p-6"><h2 className="text-xl font-bold text-green-500">مزایا</h2><ul className="mt-4 list-inside list-disc space-y-3 leading-8 text-muted">{details.pros.length?details.pros.map((x,i)=><li key={i}>{x}</li>):<li>اطلاعاتی ثبت نشده است.</li>}</ul></div><div className="rounded-3xl border border-border-theme bg-surface p-6"><h2 className="text-xl font-bold text-danger">معایب و محدودیت‌ها</h2><ul className="mt-4 list-inside list-disc space-y-3 leading-8 text-muted">{details.cons.length?details.cons.map((x,i)=><li key={i}>{x}</li>):<li>اطلاعاتی ثبت نشده است.</li>}</ul></div></section>
        <section id="discount" className="scroll-mt-24 rounded-3xl border border-border-theme bg-surface p-6 sm:p-8">
          <h2 className="text-2xl font-bold">کد تخفیف {firm.name}</h2>
          {firm.code ? <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl border border-border-theme bg-surface-secondary p-5">
            <div><p className="text-sm text-muted">تخفیف ثبت‌شده: {firm.discount || "نامشخص"}</p>
              <code className="mt-2 block text-xl font-bold text-foreground" dir="ltr">{firm.code}</code></div>
            <Link className="rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground" href={`/discounts#${encodeURIComponent(firm.id)}`}>مشاهده و کپی کد</Link>
          </div> : <p className="mt-4 text-muted">در حال حاضر کد تخفیفی برای این شرکت ثبت نشده است.</p>}
        </section>

        {details.discounts.length>0 && <section className="rounded-3xl border border-border-theme bg-surface p-6 sm:p-8"><h2 className="mb-5 text-xl font-bold">تخفیف‌های تکمیلی</h2><div className="grid gap-3 sm:grid-cols-2">{details.discounts.map((d,i)=><div key={i} className="rounded-xl border border-border-theme bg-surface-secondary p-4"><p className="font-bold text-primary">{d.amount}</p><code dir="ltr" className="mt-2 inline-block font-bold">{d.code}</code><p className="mt-3 text-sm text-muted">{d.note}</p></div>)}</div></section>}
        <section id="faq" className="scroll-mt-24 rounded-3xl border border-border-theme bg-surface p-6 sm:p-8"><h2 className="text-2xl font-bold">سوالات متداول درباره {firm.name}</h2>{details.faqs.length ? <div className="mt-4 space-y-3">{details.faqs.map((x,i)=><details key={i} className="rounded-xl border border-border-theme p-4"><summary className="cursor-pointer font-bold">{x.question}</summary><p className="mt-4 whitespace-pre-line leading-8 text-muted">{x.answer}</p></details>)}</div>:<p className="mt-4 text-muted">سوال متداولی ثبت نشده است.</p>}</section>
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
