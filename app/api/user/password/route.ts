import { NextRequest,NextResponse } from 'next/server';
import { validOrigin } from '@/lib/guard';
import { register,login,resetPassword } from '@/lib/password-auth';
import { createUserSession,userCookie } from '@/lib/user-auth';
export const runtime='nodejs'; export const dynamic='force-dynamic';
export async function POST(request:NextRequest) {
  if (!validOrigin(request))return NextResponse.json({error:'درخواست نامعتبر است.'},{status:403});
  if(Number(request.headers.get('content-length')||0)>8192)return NextResponse.json({error:'درخواست بیش از حد بزرگ است.'},{status:413});
  const b=await request.json().catch(()=>null);
  if(!b||typeof b!=='object')return NextResponse.json({error:'اطلاعات نامعتبر است.'},{status:400});
  const str=(key:string)=>typeof b[key]==='string'?b[key]:'';
  try {
    if(b.action==='register') {
      const {user}=await register({email:str('email'),phone:str('phone'),name:str('name'),password:str('password')});
      const response=NextResponse.json({ok:true});
      response.cookies.set(userCookie.name,createUserSession(user),userCookie.options);return response;
    }
    if(b.action==='login') {
      const {user,version}=await login(str('identifier'),str('password'));
      const response=NextResponse.json({ok:true});response.cookies.set(userCookie.name,createUserSession(user,version),userCookie.options);return response;
    }
    if(b.action==='reset') {
      const {user,version}=await resetPassword({email:str('email'),phone:str('phone'),newPassword:str('newPassword')});
      const response=NextResponse.json({ok:true});
      response.cookies.set(userCookie.name,createUserSession(user,version),userCookie.options);return response;
    }
    return NextResponse.json({error:'عملیات نامعتبر است.'},{status:400});
  }catch(e) {
    const error=e instanceof Error?e.message:'درخواست ناموفق بود.';
    console.error('Password auth failure:',error);
    return NextResponse.json({error},{status:error.includes('زیادی')?429:400});
  }
}
