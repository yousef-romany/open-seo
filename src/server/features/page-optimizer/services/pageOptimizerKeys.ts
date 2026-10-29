export function normalizePageOptimizerUrl(url: string): string {
  return new URL(url).href;
}

export function pageOptimizerKeywordKey(keyword: string): string {
  return keyword
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
