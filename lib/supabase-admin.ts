import 'server-only';
import { Pool } from 'pg';
import { mkdir, writeFile, unlink, readdir } from 'node:fs/promises';
import path from 'node:path';

const globalDb = globalThis as typeof globalThis & { __propinPool?: Pool };
const pool = globalDb.__propinPool ?? new Pool({ connectionString: process.env.DATABASE_URL, max: 12 });
if (process.env.NODE_ENV !== 'production') globalDb.__propinPool = pool;
const tables = new Set(['admin_credentials','article_image_references','article_lottery_entries','article_lottery_settings','article_lottery_winners','articles','prop_firms','site_login_codes','site_polls','site_settings','site_users','support_messages','support_threads','wheel_draws','wheel_prizes','wheel_settings','wheel_spins']);
const ident = (v: string) => { if (!/^[a-z][a-z0-9_]*$/.test(v)) throw Error('Invalid SQL identifier'); return '"'+v+'"'; };
const safeTable = (name: string) => { if (!tables.has(name)) throw Error('Unknown table: '+name); return ident(name); };
const storageRoot = path.join(process.cwd(), '.uploads');
function safePath(bucket: string, file: string) {
  const full = path.resolve(storageRoot, bucket, file);
  if (!/^[a-zA-Z0-9_-]+$/.test(bucket) || !full.startsWith(path.resolve(storageRoot, bucket)+path.sep)) throw Error('Invalid upload path');
  return full;
}
class Query {
  private action = 'get'; private fields = '*'; private body: any; private filters: string[] = []; private args: any[] = [];
  private sort: string[] = []; private cap?: number; private offset?: number; private one = false; private optional = false;
  private head = false; private count = false; private conflict?: string;
  constructor(private table: string) { safeTable(table); }
  private param(v: any) { this.args.push(v); return '$'+this.args.length; }
  select(fields = '*', options?: {count?: string; head?: boolean}) { this.fields=fields; this.head=!!options?.head; this.count=options?.count==='exact'; return this; }
  insert(value:any) { this.action='insert'; this.body=value; return this; }
  update(value:any) { this.action='update'; this.body=value; return this; }
  upsert(value:any, options?:{onConflict?:string}) { this.action='upsert'; this.body=value; this.conflict=options?.onConflict; return this; }
  delete() { this.action='delete'; return this; }
  eq(col:string,v:any) { this.filters.push(ident(col)+' = '+this.param(v)); return this; }
  neq(col:string,v:any) { this.filters.push(ident(col)+' <> '+this.param(v)); return this; }
  is(col:string,v:any) { this.filters.push(ident(col)+(v===null?' IS NULL':' IS NOT NULL')); return this; }
  not(col:string,op:string,v:any) { if(op!=='is') throw Error('Unsupported filter'); this.filters.push(ident(col)+(v===null?' IS NOT NULL':' IS NULL')); return this; }
  in(col:string,values:any[]) { this.filters.push(ident(col)+' = ANY('+this.param(values)+')'); return this; }
  order(col:string,options?:{ascending?:boolean}) {this.sort.push(ident(col)+(options?.ascending===false?' DESC':' ASC'));return this;}
  limit(n:number) { this.cap=n; return this; }
  range(a:number,b:number) {this.offset=a; this.cap=b-a+1;return this;}
  single() {this.one=true;return this;}
  maybeSingle() {this.one=true;this.optional=true;return this;}
  async then(resolve:(result:any)=>any, reject?:(reason:any)=>any) { try { return resolve(await this.execute()); } catch(e) {if(reject) return reject(e); throw e;} }
  private async execute() {
    try {
      const table=safeTable(this.table), filter=this.filters.length?' WHERE '+this.filters.join(' AND '):'';
      let sql='';
      const cols=this.fields.trim()==='*'?'*':this.fields.split(',').map(s=>ident(s.trim())).join(',');
      if(this.action==='get') sql=`SELECT ${this.head?'1':cols} FROM ${table}${filter}`;
      else if(this.action==='delete') sql=`DELETE FROM ${table}${filter} RETURNING ${this.head?'1':cols}`;
      else {
        const rows=Array.isArray(this.body)?this.body:[this.body];
        if (!rows.length) return {data:[],error:null,count:0};
        if(this.action==='update') {
          const keys=Object.keys(this.body);const set=keys.map(k=>ident(k)+' = '+this.param(this.body[k])).join(',');
          sql=`UPDATE ${table} SET ${set}${filter} RETURNING ${this.head?'1':cols}`;
        } else {
          const keys=Object.keys(rows[0]);
          const tuples=rows.map(r=>'('+keys.map(k=>this.param(r[k])).join(',')+')').join(',');
          sql=`INSERT INTO ${table} (${keys.map(ident).join(',')}) VALUES ${tuples}`;
          if(this.action==='upsert') {
            const conflict=(this.conflict||'id').split(',').map(s=>ident(s.trim()));
            const updates=keys.filter(k=>!conflict.includes(ident(k))).map(k=>ident(k)+' = EXCLUDED.'+ident(k));
            sql+=` ON CONFLICT (${conflict.join(',')}) `+(updates.length?'DO UPDATE SET '+updates.join(','):'DO NOTHING');
          }
          sql+=` RETURNING ${this.head?'1':cols}`;
        }
      }
      if(this.sort.length && this.action==='get') sql+=' ORDER BY '+this.sort.join(',');
      if(this.cap!==undefined && this.action==='get') sql+=' LIMIT '+Math.max(0,Math.floor(this.cap));
      if(this.offset!==undefined && this.action==='get') sql+=' OFFSET '+Math.max(0,Math.floor(this.offset));
      const result=await pool.query(sql,this.args);
      let count:number|null=null;
      if(this.count) {const r=await pool.query('SELECT count(*)::int AS n FROM '+table+filter,this.args);count=r.rows[0].n;}
      if(this.one && result.rows.length>1) return {data:null,error:{message:'Multiple rows',code:'PGRST116'},count};
      if(this.one && !result.rows.length && !this.optional) return {data:null,error:{message:'No rows',code:'PGRST116'},count};
      return {data:this.head?null:(this.one?(result.rows[0]??null):result.rows),error:null,count};
    } catch(e:any) { return {data:null,error:{message:e.message,code:e.code??'DB_ERROR'},count:null}; }
  }
}
function storageBucket(bucket:string) {
  return {
    async upload(name:string, bytes:Buffer|Uint8Array, opts?: {
  upsert?: boolean;
  contentType?: string;
  cacheControl?: string;
}) {try {const p=safePath(bucket,name);await mkdir(path.dirname(p),{recursive:true});await writeFile(p,bytes,{flag:opts?.upsert?'w':'wx'});return {data:{path:name},error:null};}catch(e:any){return {data:null,error:{message:e.message}};}},
    getPublicUrl(name:string){ const base=(process.env.NEXT_PUBLIC_SITE_URL||'http://localhost:3000').replace(/\/$/,'');return {data:{publicUrl:base+'/uploads/'+encodeURIComponent(bucket)+'/'+name.split('/').map(encodeURIComponent).join('/')}};},
    async remove(names:string[]){try{for(const name of names){await unlink(safePath(bucket,name)).catch((e:any)=>{if(e.code!=='ENOENT')throw e;});}return {data:names.map(name=>({name})),error:null};}catch(e:any){return {data:null,error:{message:e.message}};}},
    async list(folder='',options?:{limit?:number;offset?:number;search?:string;sortBy?:unknown}) {try{const dir=path.resolve(storageRoot,bucket,folder);if(!dir.startsWith(path.resolve(storageRoot,bucket)))throw Error('Invalid path');const files=await readdir(dir,{withFileTypes:true}).catch((e:any)=>{if(e.code==='ENOENT')return [];throw e;});const names=files.filter(f=>f.isFile()&&(!options?.search||f.name.includes(options.search))).map(f=>({name:f.name,id:f.name,metadata:{}}));return {data:names.slice(options?.offset||0,(options?.offset||0)+(options?.limit||100)),error:null};}catch(e:any){return {data:null,error:{message:e.message}};}}
  };
}
export function getSupabaseAdmin() {
  if(!process.env.DATABASE_URL)throw Error('DATABASE_URL is missing');
  return {
    from(name:string){return new Query(name);},
    storage:{from:storageBucket},
    async rpc(name:string,args:Record<string,any>={}) {
      if(!['reserve_site_login_code','verify_site_login_code','spin_wheel_for_user'].includes(name))return {data:null,error:{message:'Unknown function',code:'42883'}};
      try {const keys=Object.keys(args);const values=keys.map(k=>args[k]);const sql='SELECT * FROM '+ident(name)+'('+keys.map((k,i)=>ident(k)+' => $'+(i+1)).join(',')+')';const res=await pool.query(sql,values);return {data:name==='verify_site_login_code'?res.rows:(res.rows[0]?.[name]??res.rows),error:null};}catch(e:any){return {data:null,error:{message:e.message,code:e.code??'DB_ERROR'}};}
    }
  };
}
