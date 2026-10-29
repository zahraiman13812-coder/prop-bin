
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import path from "node:path";

function loadEnvFile(filename) {
  const filePath = path.join(process.cwd(), filename);

  let contents;

  try {
    contents = readFileSync(filePath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) continue;

    const match = trimmed.match(
      /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/
    );

    if (!match) continue;

    const key = match[1];
    let value = match[2].trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");

const url = process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;

if (!url || !secret) {
  throw new Error(
    "SUPABASE_URL یا SUPABASE_SECRET_KEY در .env.local تنظیم نشده است."
  );
}

const supabase = createClient(url, secret, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const firms = [
  {
    id: "ftmo",
    name: "FTMO",
    rating: "4.8",
    capital: "$200,000",
    profit: "80%",
    fee: "$155",
    discount: "10%",
    code: "PROPIN10",
    color: "#f15c55",
    description:
      "یکی از شناخته‌شده‌ترین گزینه‌ها برای معامله‌گران با قوانین شفاف و ابزارهای تحلیلی.",
    payout: "تا ۹۰٪",
    challenge: "دو مرحله‌ای",
    logo_text: "FT",
    sort_order: 1,
    is_active: true,
  },
  {
    id: "5ers",
    name: "The 5%ers",
    rating: "4.6",
    capital: "$100,000",
    profit: "100%",
    fee: "$95",
    discount: "15%",
    code: "PROPIN15",
    color: "#b8c9ff",
    description:
      "برنامه‌های رشد حساب و مسیرهای مختلف برای معامله‌گران با تجربه‌های متفاوت.",
    payout: "تا ۱۰۰٪",
    challenge: "چند مسیر",
    logo_text: "5%",
    sort_order: 2,
    is_active: true,
  },
  {
    id: "fundednext",
    name: "FundedNext",
    rating: "4.5",
    capital: "$300,000",
    profit: "90%",
    fee: "$59",
    discount: "25%",
    code: "PROPIN25",
    color: "#7d68ff",
    description:
      "پلن‌های متنوع با گزینه‌های مختلف تقسیم سود و اندازه حساب.",
    payout: "تا ۹۰٪",
    challenge: "چند پلن",
    logo_text: "FN",
    sort_order: 3,
    is_active: true,
  },
  {
    id: "maven",
    name: "Maven Trading",
    rating: "4.3",
    capital: "$200,000",
    profit: "80%",
    fee: "$49",
    discount: "20%",
    code: "PROPIN20",
    color: "#e5eaf5",
    description:
      "گزینه‌ای برای مقایسه پلن‌ها و انتخاب چالش متناسب با سبک معاملاتی.",
    payout: "تا ۸۰٪",
    challenge: "یک یا دو مرحله‌ای",
    logo_text: "M",
    sort_order: 4,
    is_active: true,
  },
  {
    id: "alpha",
    name: "Alpha Capital",
    rating: "4.2",
    capital: "$100,000",
    profit: "90%",
    fee: "$48",
    discount: "30%",
    code: "PROPIN30",
    color: "#4986ff",
    description:
      "حساب‌ها و قوانین متنوع برای بررسی پیش از خرید چالش.",
    payout: "تا ۹۰٪",
    challenge: "چند پلن",
    logo_text: "AC",
    sort_order: 5,
    is_active: true,
  },
];

async function main() {
  // از بازنویسی ناخواسته اطلاعات موجود جلوگیری می‌کنیم.
  const ids = firms.map((firm) => firm.id);

  const { data: existing, error: readError } = await supabase
    .from("prop_firms")
    .select("id")
    .in("id", ids);

  if (readError) {
    throw readError;
  }

  const existingIds = new Set(
    (existing ?? []).map((row) => row.id)
  );

  const missing = firms.filter(
    (firm) => !existingIds.has(firm.id)
  );

  if (missing.length > 0) {
    const { error: insertError } = await supabase
      .from("prop_firms")
      .insert(missing);

    if (insertError) {
      throw insertError;
    }
  }

  console.log(
    `Inserted ${missing.length} new firms.`
  );

  console.log(
    `Skipped ${firms.length - missing.length} existing firms.`
  );

  const { data, error } = await supabase
    .from("prop_firms")
    .select("id, name, is_active, sort_order")
    .in("id", ids)
    .order("sort_order", { ascending: true });

  if (error) throw error;

  console.table(data);

  console.log("Finished successfully.");
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exitCode = 1;
});
