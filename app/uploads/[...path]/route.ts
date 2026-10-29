import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
export const runtime='nodejs';
const types:Record<string,string>={'.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.gif':'image/gif','.svg':'image/svg+xml','.avif':'image/avif'};
export async function GET(_req:NextRequest,{params}:{params:Promise<{path:string[]}>}) {
  const parts=(await params).path;
  if(parts.length<2||parts.some(p=>!p||p==='.'||p==='..'||p.includes('\\')))return new NextResponse('Not found',{status:404});
  const root=path.resolve(process.cwd(),'.uploads');const filename=path.resolve(root,...parts);
  if(!filename.startsWith(root+path.sep))return new NextResponse('Not found',{status:404});
  try {const data=await readFile(filename);const mime=types[path.extname(filename).toLowerCase()]||'application/octet-stream';return new NextResponse(data,{headers:{'Content-Type':mime,'Cache-Control':'public, max-age=86400','X-Content-Type-Options':'nosniff'}});}catch{return new NextResponse('Not found',{status:404});}
}
