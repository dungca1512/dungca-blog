export const SITE_URL = "https://blog-dungca.ai-innovation-homelab.org";
export const SITE_NAME = "Blog của Dũng";
export const PORTFOLIO_URL = "https://portfolio-dungca.ai-innovation-homelab.org/";
export const GITHUB_URL = "https://github.com/dungca1512";

export function absoluteUrl(pathname = "/"): string {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;

  return new URL(normalized, SITE_URL).toString();
}
