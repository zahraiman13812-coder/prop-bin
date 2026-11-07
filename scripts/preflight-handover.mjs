import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const file = resolve(process.cwd(), process.argv[2] || ".env.local");
let raw;
try { raw = readFileSync(file, "utf8"); }
catch { console.error("Missing environment file:", file); process.exit(1); }
const vars = Object.fromEntries(raw.split(/\r?\n/).filter(s => /^\s*[A-Z_]+\s*=/.test(s)).map(s => {
  const k = s.indexOf("="); return [s.slice(0,k).trim(),s.slice(k+1).trim().replace(/^(["'])(.*)\1$/, "$2")];
}));
let bad = false;
function issue(msg){console.error("ERROR",msg);bad=true;}
const required = ["DATABASE_URL","NEXT_PUBLIC_SITE_URL","ADMIN_PASSWORD","ADMIN_SESSION_SECRET","USER_AUTH_SECRET","RESEND_API_KEY","MAIL_FROM"];
for (const k of required) if (!vars[k] || /REPLACE|YOUR_|CHANGE_TO/.test(vars[k])) issue(`${k} missing / placeholder`);
if (vars.NEXT_PUBLIC_SITE_URL !== "https://propbin.com") issue("NEXT_PUBLIC_SITE_URL should be https://propbin.com for this handover");
if (vars.DEV_MOCK_LOGIN === "true" || vars.DEMO_LOGIN_ENABLED === "true") issue("Demo/mock login must be disabled in production");
if (vars.ADMIN_PASSWORD?.length < 16 || vars.ADMIN_PASSWORD === "123456") issue("ADMIN_PASSWORD must be long and unique");
for (const k of ["ADMIN_SESSION_SECRET","USER_AUTH_SECRET"]) if ((vars[k] || "").length < 32) issue(`${k} must have at least 32 characters`);
if (vars.ADMIN_SESSION_SECRET && vars.ADMIN_SESSION_SECRET === vars.USER_AUTH_SECRET) issue("Session secrets must be different");
if (/gmail\.com[>\s]*$/i.test(vars.MAIL_FROM || "")) issue("MAIL_FROM must use a verified sender domain, not a personal Gmail address");
if (!vars.RESEND_API_KEY?.startsWith("re_")) issue("Resend API key does not have its expected prefix");
if ((vars.DATABASE_URL || "").includes("localhost") || (vars.DATABASE_URL || "").includes("127.0.0.1")) {
  console.log("INFO: database host is local; PostgreSQL must run on the same VPS.");
}
console.log(bad ? "Preflight failed. Fix configuration before deployment." : "Preflight config checks passed. Network/database/email functionality still requires live tests.");
process.exitCode = bad ? 1 : 0;
