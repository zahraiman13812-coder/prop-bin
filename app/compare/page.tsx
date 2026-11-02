"use client";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import type { Firm } from "@/lib/data";
import FirmLogo from "@/components/FirmLogo";
import { firmSpecificationFields, type FirmSpecifications } from "@/lib/firm-specifications";

type Row={id:string;label:string;row_key:string|null;position:number;is_visible:boolean;values_json:Record<string,string>};
const basic = [
  {key:"rating",label:"امتیاز کاربران"},{key:"capital",label:"حداکثر سرمایه"},
  {key:"profit",label:"سهم سود"},{key:"fee",label:"هزینه شروع"},
  {key:"code",label:"کد تخفیف"},{key:"discount",label:"میزان تخفیف"},
  {key:"challenge",label:"نوع چالش"},{key:"payout",label:"پرداخت سود"}
] as const;
export default function ComparePage() {
  const [firms,setFirms]=useState<Firm[]>([]);
  const [selected,setSelected]=useState<string[]>([]);
  const [managedRows,setManagedRows]=useState<Row[]>([]);
  const [specifications,setSpecifications]=useState<Record<string,FirmSpecifications>>({});
  useEffect(()=>{
    void fetch("/api/firms",{cache:"no-store"}).then(r=>r.json()).then(d=>{
      if(!d.success||!Array.isArray(d.firms))return;
      const entries=d.firms as Firm[];setFirms(entries);
      const requested=new URLSearchParams(window.location.search).get("firms")?.split(",").map(x=>decodeURIComponent(x.trim()))||[];
      const valid=requested.filter(id=>entries.some(f=>f.id===id)).slice(0,5);
      setSelected(valid.length?valid:entries.slice(0,4).map(f=>f.id));
    }).catch(()=>{});
    void fetch("/api/compare-rows",{cache:"no-store"}).then(r=>r.ok?r.json():Promise.reject()).then(d=>setManagedRows(Array.isArray(d.rows)?d.rows:[])).catch(()=>{});
  },[]);
  useEffect(()=>{
    if(!firms.length)return;
    void Promise.all(firms.map(async firm=>{
      try{const r=await fetch(`/api/firm-specifications?firmId=${encodeURIComponent(firm.id)}`,{cache:"no-store"});const d=await r.json();return [firm.id,r.ok?d.specifications||{}:{}] as const;}
      catch{return [firm.id,{}] as const;}
    })).then(entries=>setSpecifications(Object.fromEntries(entries))).catch(()=>{});
  },[firms]);
  const visible=useMemo(()=>firms.filter(f=>selected.includes(f.id)),[firms,selected]);
  const byKey=useMemo(()=>new Map(managedRows.filter(r=>r.row_key).map(r=>[r.row_key,r])),[managedRows]);
  function toggle(id:string){setSelected(current=>current.includes(id)?current.filter(x=>x!==id):current.length<5?[...current,id]:current);}
  function display(key:string,firm:Firm,isBasic:boolean){
    const override=byKey.get(key)?.values_json?.[firm.id];
    if(override?.trim())return override;
    if(isBasic){const v=(firm as unknown as Record<string,string>)[key];return key==="rating"?`★ ${v||"0"} / ۵`:v||"ثبت نشده";}
    return specifications[firm.id]?.[key as keyof FirmSpecifications]||"ثبت نشده";
  }
  const columns=[...basic.map(x=>({...x,isBasic:true})),...firmSpecificationFields.map(x=>({...x,isBasic:false}))];
  return <div className="page-shell"><div className="container">
    <div className="page-heading"><span className="eyebrow">مقایسه کنار هم</span><h1>مقایسه <em>شرکت‌های پراپ</em></h1><p>تا پنج شرکت را انتخاب کن. جدول در موبایل به‌صورت افقی قابل پیمایش است.</p></div>
    <div className="compare-select"><b>انتخاب شرکت‌ها</b><div className="select-chips">{firms.map(f=><button key={f.id} onClick={()=>toggle(f.id)} className={selected.includes(f.id)?"selected":""} aria-pressed={selected.includes(f.id)}><span>＋</span>{f.name}</button>)}</div><small>حداکثر ۵ شرکت قابل انتخاب است.</small></div>
    <div className="table-wrap"><table className="compare-table"><thead><tr><th>معیار</th>{visible.map(f=><th key={f.id}><FirmLogo firm={f} className="table-mark overflow-hidden" imageClassName="h-full w-full object-contain p-1" style={{"--firm-color":f.color} as CSSProperties}/><div className="mt-2">{f.name}</div><Link href={`/firms/${encodeURIComponent(f.id)}`} className="mt-2 inline-block text-xs font-semibold text-primary underline">بررسی کامل</Link></th>)}</tr></thead><tbody>
    {columns.filter(c=>byKey.get(c.key)?.is_visible!==false).map(c=><tr key={c.key}><th>{byKey.get(c.key)?.label||c.label}</th>{visible.map(f=><td key={f.id} className="max-w-[300px] whitespace-normal break-words">{display(c.key,f,c.isBasic)}{c.key==="code"&&display(c.key,f,true)!=="ثبت نشده"&&<button type="button" className="mr-2 rounded-lg border border-border-theme px-2 py-1 text-xs text-primary" onClick={()=>void navigator.clipboard.writeText(display(c.key,f,true))}>کپی</button>}</td>)}</tr>)}
    {managedRows.filter(r=>!r.row_key&&r.is_visible).map(r=><tr key={r.id}><th>{r.label}</th>{visible.map(f=><td key={f.id} className="max-w-[300px] whitespace-normal break-words">{r.values_json?.[f.id]||"—"}</td>)}</tr>)}
    </tbody></table></div>
    <p className="table-disclaimer">* اطلاعات بر اساس مقادیر ثبت‌شده توسط مدیر نمایش داده می‌شود. پیش از خرید، شرایط رسمی شرکت را بررسی کنید.</p>
  </div></div>;
}
