
import type { Metadata } from "next";

import { getActivePropFirms } from "@/lib/supabase-firms";
import FirmsDirectory from "@/components/FirmsDirectory";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "بررسی پراپ‌ها",
  description:
    "بررسی و مقایسه شرکت‌های پراپ در پراپین؛ مشاهده امتیاز، سرمایه، سهم سود، هزینه چالش و قوانین شرکت‌ها.",
};

export default async function FirmsPage() {
  // دریافت فقط شرکت‌های فعال از Supabase
  const firms = await getActivePropFirms();

  return <FirmsDirectory firms={firms} />;
}
