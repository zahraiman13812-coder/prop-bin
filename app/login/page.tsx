"use client";
import { useState,type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
type Mode='login'|'register'|'reset';
export default function LoginPage(){
 const router=useRouter();const [mode,setMode]=useState<Mode>('login');
 const [name,setName]=useState(''),[email,setEmail]=useState(''),[phone,setPhone]=useState(''),[identifier,setIdentifier]=useState(''),[password,setPassword]=useState(''),[recovery,setRecovery]=useState('');
 const [loading,setLoading]=useState(false),[error,setError]=useState(''),[newCode,setNewCode]=useState('');
 const next=typeof window!=='undefined'?new URLSearchParams(window.location.search).get('next'):null;
 const destination=next?.startsWith('/')&&!next.startsWith('//')&&!next.startsWith('/\\')?next:'/account';
 async function submit(e:FormEvent){e.preventDefault();setLoading(true);setError('');try{
 const body=mode==='login'?{action:'login',identifier,password}:mode==='register'?{action:'register',name,email,phone,password}:{action:'reset',email,phone,recoveryCode:recovery,newPassword:password};
 const response=await fetch('/api/user/password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const data=await response.json();if(!response.ok)throw new Error(data.error||'درخواست ناموفق بود.');
 if(data.recoveryCode){setNewCode(data.recoveryCode);setPassword('');return;}
 router.replace(destination);router.refresh();
 }catch(err){setError(err instanceof Error?err.message:'خطا در ارسال درخواست');}finally{setLoading(false);}}
 return <main dir="rtl" className="mx-auto max-w-lg px-4 py-20"><div className="rounded-2xl border border-border-theme bg-surface p-7 text-foreground">
 <h1 className="mb-6 text-2xl font-bold">حساب کاربری پراپین</h1>
 {newCode?<div className="space-y-4"><h2 className="font-bold">کد بازیابی جدید</h2><p>این کد فقط همین بار نمایش داده می‌شود. آن را در جای امن نگهداری کنید؛ برای بازیابی رمز بدون ایمیل یا پیامک لازم است.</p><p dir="ltr" className="break-all rounded-xl border p-3 font-mono select-all">{newCode}</p><button className="rounded-xl bg-primary p-3 text-primary-foreground" onClick={()=>{setNewCode('');router.replace(destination);router.refresh();}}>کد را ذخیره کردم</button></div>:<>
 <div className="mb-5 flex gap-3">{([['login','ورود'],['register','ثبت‌نام'],['reset','بازیابی رمز']] as const).map(([value,label])=><button type="button" key={value} aria-pressed={mode===value} onClick={()=>{setMode(value);setError('')}} className={`rounded-lg border px-3 py-2 ${mode===value?'bg-primary text-primary-foreground':''}`}>{label}</button>)}</div>
 <form onSubmit={submit} className="space-y-4">
 {mode==='register'&&<label className="block">نام و نام خانوادگی<input required minLength={2} maxLength={80} value={name} onChange={e=>setName(e.target.value)} className="mt-2 w-full rounded-lg border bg-background p-3"/></label>}
 {mode==='login'?<label className="block">ایمیل یا شماره موبایل<input required value={identifier} onChange={e=>setIdentifier(e.target.value)} className="mt-2 w-full rounded-lg border bg-background p-3"/></label>:<><label className="block">ایمیل<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 w-full rounded-lg border bg-background p-3"/></label><label className="block">شماره موبایل<input required inputMode="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="09123456789" className="mt-2 w-full rounded-lg border bg-background p-3"/></label></>}
 {mode==='reset'&&<label className="block">کد بازیابی ذخیره‌شده<input required value={recovery} onChange={e=>setRecovery(e.target.value)} className="mt-2 w-full rounded-lg border bg-background p-3"/></label>}
 <label className="block">{mode==='reset'?'رمز عبور جدید':'رمز عبور'}<input required type="password" minLength={mode==='login'?1:12} maxLength={128} autoComplete={mode==='login'?'current-password':'new-password'} value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 w-full rounded-lg border bg-background p-3"/>{mode!=='login'&&<span className="text-sm text-muted">حداقل ۱۲ کاراکتر</span>}</label>
 {mode==='reset'&&<p className="text-sm text-muted">برای امنیت، دانستن ایمیل و موبایل کافی نیست؛ کد بازیابی زمان ثبت‌نام نیز لازم است.</p>}
 {error&&<p role="alert" className="text-red-500">{error}</p>}
 <button disabled={loading} type="submit" className="w-full rounded-xl bg-primary p-3 font-bold text-primary-foreground disabled:opacity-50">{loading?'در حال بررسی...':mode==='login'?'ورود':mode==='register'?'ثبت‌نام':'تغییر رمز عبور'}</button>
 </form></>}
 </div></main>;
}
