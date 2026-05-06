export function readingTime(text: string): number {
  if (!text) return 1;
  // Strip markdown/html roughly
  const clean = text.replace(/<[^>]+>/g, "").replace(/[#>*`_\-!\[\]()]/g, "");
  const chars = clean.replace(/\s/g, "").length;
  return Math.max(1, Math.round(chars / 500));
}
