import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!url || !secretKey) {
  console.error(
    "Missing SUPABASE_URL or SUPABASE_SECRET_KEY. Run with: node --env-file=.env.local scripts/migrate-site-settings.mjs"
  );
  process.exit(1);
}

const filePath = path.resolve(process.cwd(), "data", "content.json");
const raw = await readFile(filePath, "utf8");
const parsed = JSON.parse(raw);

if (
  !parsed ||
  typeof parsed !== "object" ||
  Array.isArray(parsed) ||
  !parsed.settings ||
  typeof parsed.settings !== "object" ||
  Array.isArray(parsed.settings)
) {
  throw new Error("data/content.json does not contain a valid settings object.");
}

const supabase = createClient(url, secretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Existing database schema: public.site_settings.id is INTEGER, so use id=1.
// This upsert updates only the canonical settings row and does not edit content.json.
const { error } = await supabase
  .from("site_settings")
  .upsert(
    {
      id: 1,
      settings: parsed.settings,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

if (error) {
  console.error("Settings migration failed:", {
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint,
  });
  process.exit(1);
}

console.log("Site settings migrated to public.site_settings (id=1) successfully.");
console.log("The original data/content.json file was not changed.");
