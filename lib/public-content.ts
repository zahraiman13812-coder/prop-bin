
import "server-only";

import {
  getContent,
  type Content,
} from "@/lib/content";

import {
  getActivePropFirms,
} from "@/lib/supabase-firms";

/**
 * محتوای عمومی پراپین
 *
 * سایر اطلاعات از سیستم فعلی سایت دریافت می‌شوند.
 * فقط فهرست شرکت‌ها از Supabase جایگزین می‌شود.
 */
export async function getPublicContent(): Promise<Content> {
  const [content, firms] = await Promise.all([
    getContent(),
    getActivePropFirms(),
  ]);

  return {
    ...content,
    firms,
  };
}
