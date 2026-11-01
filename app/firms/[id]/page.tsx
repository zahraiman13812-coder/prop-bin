import Link from "next/link";
import { notFound } from "next/navigation";
import FirmLogo from "@/components/FirmLogo";
import FirmQuestionForm from "@/components/FirmQuestionForm";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getActivePropFirms } from "@/lib/supabase-firms";
import { getPolls } from "@/lib/supabase-polls";
export const dynamic = "force-dynamic";
export default async function FirmDetails({ params }: { params: Promise<{ id: string }> }) {
 const {id} = await params;
 const firms = await getActivePropFirms();
 const firm = firms.find(f=>f.id===id);
 if (!firm) notFound();
 const approved = (await getPolls()).filter(p=>p.firmId===id && p.approved && p.comment.trim());
 const {data:questionRows,error:questionsError}=await getSupabaseAdmin().from("firm_questions").select("id,display_name,question,created_at").eq("firm_id",id).eq("approved",true).order("created_at",{ascending:false}).limit(100);
 if(questionsError) console.error("Firm questions",questionsError);
 const questions=(questionRows??[]) as {id:string;display_name:string;question:string;created_at:string}[];
 const details = [ ["حداکثر سرمایه",firm.capital],["سهم سود",firm.profit],["هزینه شروع",firm.fee],["نوع چالش",firm.challenge],["پرداخت سود",firm.payout],["امتیاز",firm.rating],["کد تخفیف",firm.code || "—"],["درصد تخفیف",firm.discount || "—"] ];
 return <main dir="rtl" className="page-shell"><div className="container mx-auto max-w-5xl space-y-8 py-12"><section className="rounded-3xl border border-border-theme bg-surface p-6 sm:p-10"><div className="flex items-center gap-4"><FirmLogo firm={firm} className="h-16 w-16"/><div><h1 className="text-3xl font-extrabold">بررسی کامل {firm.name}</h1><p className="mt-2 text-muted">اطلاعات شرکت ثبت‌شده در پراپ‌بین</p></div></div><p className="mt-8 leading-9 text-muted">{firm.description}</p><div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-4">{details.map(([label,value])=><div key={label} className="rounded-xl border border-border-theme bg-surface-secondary p-4"><p className="text-xs text-muted">{label}</p><p className="mt-2 font-bold">{value}</p></div>)}</div><div className="mt-7 flex gap-3"><Link className="rounded-xl bg-primary px-5 py-3 text-primary-foreground" href={`/discounts#${firm.id}`}>مشاهده تخفیف</Link><Link className="rounded-xl border border-border-theme px-5 py-3" href={`/compare?firms=${encodeURIComponent(firm.id)}`}>مقایسه شرکت</Link></div></section><section className="rounded-3xl border border-border-theme bg-surface p-6 sm:p-10"><h2 className="text-2xl font-bold">پرسش و گفت‌وگو درباره {firm.name}</h2><p className="mt-3 text-sm text-muted">پیام‌ها تنها پس از تأیید مدیر نمایش داده می‌شوند.</p><Link className="mt-5 inline-flex rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground" href={`/polls?firm=${encodeURIComponent(firm.id)}`}>ثبت امتیاز و نظر درباره این شرکت</Link><FirmQuestionForm firmId={firm.id}/><div className="mt-8 space-y-4">{questions.map(q=><article key={q.id} className="rounded-xl border border-border-theme bg-surface-secondary p-5"><p className="font-semibold">{q.display_name||"کاربر سایت"}</p><p className="mt-3 whitespace-pre-wrap leading-8 text-muted">{q.question}</p></article>)}{approved.length ? approved.map(p=><article key={p.id} className="rounded-xl border border-border-theme bg-surface-secondary p-5"><p className="font-semibold">{p.displayName || "کاربر سایت"}</p><p className="mt-3 whitespace-pre-wrap leading-8 text-muted">{p.comment}</p></article>) : <p className="text-muted">هنوز گفت‌وگوی تأییدشده‌ای ثبت نشده است.</p>}</div></section></div></main>;
}
