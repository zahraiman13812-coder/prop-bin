export function isValidArticleImage(
  image: string | null | undefined
): boolean {
  if (!image) return false;

  const localPattern =
    /^\/(?:uploads\/articles|articles)\/[a-zA-Z0-9._-]+\.(jpg|jpeg|png|webp)$/i;

  if (localPattern.test(image)) return true;

  try {
    const url = new URL(image);
    if (url.protocol !== "https:" || url.username || url.password) {
      return false;
    }

    // Public Vercel Blob URLs use a unique store subdomain.
    if (/^[a-z0-9-]+\.public\.blob\.vercel-storage\.com$/i.test(url.hostname)) {
      return true;
    }

    // Support previously uploaded images still stored in Supabase.
    const supabaseUrl = process.env.SUPABASE_URL;
    if (!supabaseUrl) return false;
    const projectUrl = new URL(supabaseUrl);

    return (
      url.origin === projectUrl.origin &&
      url.pathname.startsWith(
        "/storage/v1/object/public/article-images/"
      )
    );
  } catch {
    return false;
  }
}
