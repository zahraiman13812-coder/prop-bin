
export function isValidArticleImage(
  image: string | null | undefined
): boolean {
  if (!image) return false;

  // تصاویر محلی سایت
  const localPattern =
    /^\/(?:uploads\/articles|articles)\/[a-zA-Z0-9._-]+\.(jpg|jpeg|png|webp)$/i;

  if (localPattern.test(image)) {
    return true;
  }

  // تصاویر عمومی Supabase Storage
  try {
    const url = new URL(image);

    const supabaseUrl =
      process.env.SUPABASE_URL;

    if (!supabaseUrl) return false;

    const projectUrl = new URL(supabaseUrl);

    return (
      url.protocol === "https:" &&
      url.origin === projectUrl.origin &&
      url.pathname.startsWith(
        "/storage/v1/object/public/article-images/"
      ) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}
