import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/user-auth";
import { getActivePropFirms } from "@/lib/supabase-firms";
import { validOrigin } from "@/lib/guard";
export const runtime="nodejs"; export const dynamic="force-dynamic";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function POST(req:NextRequest) {
 if(!validOrigin(req)) return NextResponse.json({error:"درخواست نامعتبر"},{status:403});
 const user=await getCurrentUser(); if(!user) return NextResponse.json({error:"برای ثبت پرسش وارد حساب شوید"},{status:401});
 const body=await req.json().catch(()=>null);const id=body?.firmId;const question=typeof body?.question==="string"?body.question.trim():"";
 if(typeof id!=="string"||!uuid.test(id)||question.length<5||question.length>1500) return NextResponse.json({error:"متن یا شناسه شرکت نامعتبر است"},{status:400});
 try {
  const active=await getActivePropFirms();if(!active.some(f=>f.id===id))return NextResponse.json({error:"شرکت فعال پیدا نشد"},{status:404});
  const db=getSupabaseAdmin();
  const {data:previous,error:checkError}=await db.from("firm_questions").select("id").eq("user_id",user.id).eq("firm_id",id).limit(20);
  if(checkError)throw checkError;
  if((previous?.length??0)>=20)return NextResponse.json({error:"حداکثر تعداد پرسش‌های شما برای این شرکت ثبت شده است"},{status:429});
  const {error}=await db.from("firm_questions").insert({firm_id:id,user_id:user.id,display_name:user.name,question,approved:false});if(error)throw error;
  return NextResponse.json({ok:true,message:"پرسش ثبت شد و پس از تأیید مدیر نمایش داده می‌شود"},{status:201});
 }catch(err){console.error("firm questions create",err);return NextResponse.json({error:"ثبت پرسش ناموفق بود؛ جدول دیتابیس را بررسی کنید"},{status:500});}
}
