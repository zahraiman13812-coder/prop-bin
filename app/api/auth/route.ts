import { NextRequest, NextResponse } from "next/server";
import { isAdmin, newSession, passwordMatches, sessionCookie } from "@/lib/auth";
import { validOrigin } from "@/lib/guard";
export const runtime="nodejs";
export async function GET(){return NextResponse.json({authenticated:await isAdmin()},{headers:{"Cache-Control":"no-store"}});}
export async function POST(req:NextRequest){
 if(!validOrigin(req))return NextResponse.json({error:"درخواست نامعتبر"},{status:403});
 const body=await req.json().catch(()=>({}));
 if(typeof body.password!=="string"||!(await passwordMatches(body.password)))return NextResponse.json({error:"رمز عبور نادرست است یا سرور تنظیم نشده"},{status:401});
 const res=NextResponse.json({ok:true});res.cookies.set(sessionCookie.name,await newSession(),sessionCookie.options);return res;
}
export async function DELETE(req:NextRequest){
 if(!validOrigin(req))return NextResponse.json({error:"درخواست نامعتبر"},{status:403});
 const res=NextResponse.json({ok:true});res.cookies.set(sessionCookie.name,"",{...sessionCookie.options,maxAge:0});return res;
}
