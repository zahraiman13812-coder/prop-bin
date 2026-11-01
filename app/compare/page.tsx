"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import type { CSSProperties } from "react";
import type { Firm } from "@/lib/data";
import FirmLogo from "@/components/FirmLogo";
type FirmField =
  | "rating"
  | "capital"
  | "profit"
  | "fee"
  | "code"
  | "discount"
  | "challenge"
  | "payout";

const defaultRows: {
  label: string;
  key: FirmField;
  format?: (value: string) => string;
}[] = [
  {
    label: "امتیاز کاربران",
    key: "rating",
    format: (value) => "★ " + value + " / ۵",
  },
  { label: "حداکثر سرمایه", key: "capital" },
  { label: "سهم سود", key: "profit" },
  { label: "هزینه شروع", key: "fee" },
  { label: "کد تخفیف", key: "code" },
  { label: "میزان تخفیف", key: "discount" },
  { label: "نوع چالش", key: "challenge" },
  { label: "پرداخت سود", key: "payout" },
];

type CompareRow = {id:string;label:string;row_key:string|null;position:number;is_visible:boolean;values_json:Record<string,string>};
export default function ComparePage() {
 const [managedRows,setManagedRows]=useState<CompareRow[]>([]);
 useEffect(()=>{fetch("/api/compare-rows",{cache:"no-store"}).then(r=>r.ok?r.json():Promise.reject()).then(d=>setManagedRows(Array.isArray(d.rows)?d.rows:[])).catch(()=>{});},[]);

  const [hiddenRows, setHiddenRows] = useState<string[]>([]);
  const [extraRows, setExtraRows] = useState<string[]>([]);
  const [newRow, setNewRow] = useState("");
  const [firms, setFirms] = useState<Firm[]>([]);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/firms")
  .then((response) => {
    if (!response.ok) {
      throw new Error("خطا در دریافت شرکت‌ها");
    }

    return response.json();
  })
  .then((data) => {
    if (!data.success || !Array.isArray(data.firms)) {
      throw new Error("اطلاعات دریافتی نامعتبر است");
    }

    const entries = data.firms as Firm[];
        setFirms(entries);

        /*
         * `/firms` links here with ?firms=<id>. Use that selection when it
         * contains valid ids; otherwise fall back to the first four firms.
         */
        const requested = new URLSearchParams(
          window.location.search
        )
          .get("firms")
          ?.split(",")
          .map((id) => {
            try {
              return decodeURIComponent(id.trim());
            } catch {
              return "";
            }
          })
          .filter(Boolean);

        const valid = (requested || [])
          .filter((id) =>
            entries.some((firm) => firm.id === id)
          )
          .slice(0, 5);

        setSelected(
          valid.length
            ? valid
            : entries.slice(0, 4).map((firm) => firm.id)
        );
      })
      .catch(() => {});
  }, []);

  const persistedHidden=managedRows.filter(r=>r.row_key&&!r.is_visible).map(r=>r.row_key);
  const visible = useMemo(
    () =>
      firms.filter((firm) =>
        selected.includes(firm.id)
      ),
    [firms, selected]
  );

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : current.length < 5
          ? [...current, id]
          : current
    );
  }

  return (
    <div className="page-shell">
      <div className="container">
        <div className="page-heading">
          <span className="eyebrow">مقایسه کنار هم</span>
          <h1>
            مقایسه <em>شرکت‌های پراپ</em>
          </h1>
          <p>
            شرکت‌هایی را که می‌خواهی بررسی کنی انتخاب کن. جدول
            برای نمایش در موبایل هم قابل پیمایش است.
          </p>
        </div>

        <div className="compare-select">
          <b>انتخاب شرکت‌ها</b>
          <div className="select-chips">
            {firms.map((firm) => (
              <button
                key={firm.id}
                onClick={() => toggle(firm.id)}
                className={
                  selected.includes(firm.id)
                    ? "selected"
                    : ""
                }
                aria-pressed={selected.includes(firm.id)}
              >
                <span>＋</span>
                {firm.name}
              </button>
            ))}
          </div>
          <small>حداکثر ۵ شرکت قابل انتخاب است.</small>
        </div>

        <div className="mb-4 rounded-xl border border-border-theme bg-surface p-4"><p className="mb-3 font-bold">مدیریت ردیف‌های جدول مقایسه</p><div className="flex flex-wrap gap-2">{defaultRows.map(row=><button key={row.key} type="button" onClick={()=>setHiddenRows(prev=>prev.includes(row.key)?prev.filter(x=>x!==row.key):[...prev,row.key])} className="rounded-lg border border-border-theme px-3 py-2 text-xs">{hiddenRows.includes(row.key)?"افزودن":"حذف"} {row.label}</button>)}</div><div className="mt-4 flex gap-2"><input value={newRow} onChange={e=>setNewRow(e.target.value)} placeholder="نام ردیف جدید" maxLength={80} className="rounded-lg border border-border-theme bg-background px-3 py-2 text-foreground"/><button type="button" className="rounded-lg bg-primary px-4 py-2 text-primary-foreground" onClick={()=>{const v=newRow.trim();if(v && !extraRows.includes(v))setExtraRows(prev=>[...prev,v]);setNewRow("");}}>افزودن ردیف</button></div><p className="mt-2 text-xs text-muted">ردیف‌های اضافه‌شده در این صفحه مقدار اختصاصی ندارند؛ برای ذخیره دائمی اطلاعات باید مدیر آن‌ها را ثبت کند.</p></div>
        <div className="table-wrap">
          <table className="compare-table">
            <thead>
              <tr>
                <th>معیار</th>
                {visible.map((firm) => (
                  <th key={firm.id}>
                    <FirmLogo
                      firm={firm}
                      className="table-mark overflow-hidden"
                      imageClassName="h-full w-full object-contain p-1"
                      style={
                        {
                          "--firm-color": firm.color,
                        } as CSSProperties
                      }
                    />
                    {firm.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {defaultRows.filter(row=>!hiddenRows.includes(row.key) && !persistedHidden.includes(row.key)).map((row) => (
                <tr key={row.key}>
                  <th>{row.label}</th>
                  {visible.map((firm) => (
                    <td key={firm.id}>
                      {row.format
                        ? row.format(firm[row.key])
                        : firm[row.key]}
                    </td>
                  ))}
                </tr>
              ))}
              {managedRows.filter(row=>!row.row_key&&row.is_visible).map(row=><tr key={row.id}><th>{row.label}</th>{visible.map(firm=><td key={firm.id}>{row.values_json?.[firm.id]||"—"}</td>)}</tr>)}
              {extraRows.map(label=><tr key={label}><th><button type="button" onClick={()=>setExtraRows(prev=>prev.filter(x=>x!==label))} title="حذف ردیف" className="ml-2 text-danger">×</button>{label}</th>{visible.map(firm=><td key={firm.id}>—</td>)}</tr>)}
            </tbody>
          </table>
        </div>

        <p className="table-disclaimer">
          * اطلاعات شرکت‌ها بر اساس داده‌های ثبت‌شده در سایت نمایش داده می‌شوند. پیش از انتخاب، شرایط رسمی شرکت را بررسی کنید.
        </p>
      </div>
    </div>
  );
}
