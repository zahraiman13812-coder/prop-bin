"use client";
import {useState} from "react";
export default function FirmQuestionForm({firmId}:{firmId:string}){
 const [question,setQuestion]=useState("");const [status,setStatus]=useState("");const [busy,setBusy]=useState(false);
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setStatus("");try{const r=await fetch("/api/firm-questions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({firmId,question})});const data=await r.json();setStatus(data.message||data.error||"خطا");if(r.ok)setQuestion("");}catch{setStatus("ارتباط با سرور برقرار نشد")}finally{setBusy(false)}}
 return <form onSubmit={submit} className="mt-6 space-y-3"><label htmlFor="firm-question" className="block font-bold">پرسش خود را بنویسید</label><textarea id="firm-question" value={question} onChange={e=>setQuestion(e.target.value)} minLength={5} maxLength={1500} required rows={4} className="w-full rounded-xl border border-border-theme bg-background p-4 text-foreground" placeholder="پرسش درباره قوانین، شرایط و تجربه همکاری..."/><button disabled={busy} className="rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground disabled:opacity-50">{busy?"در حال ثبت...":"ارسال برای تأیید مدیر"}</button>{status&&<p role="status" className="text-sm text-muted">{status}</p>}</form>
}
