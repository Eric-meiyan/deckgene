/**
 * 简易 bot 判定：用于浏览统计过滤，宁可漏放不误杀真人。
 * 依据 User-Agent 特征;空 UA 视为非真人。server-only 使用（纯逻辑，可测）。
 */
const BOT_RE =
  /(bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|quora link|pinterest|vkshare|w3c_validator|curl|wget|python-requests|axios|node-fetch|go-http-client|headlesschrome|lighthouse|uptime|semrush|ahrefs|mj12|dotbot|petalbot|yandexbot|baiduspider|sogou web spider)/i;

export function isBot(ua: string | null | undefined): boolean {
  if (!ua || !ua.trim()) return true;
  return BOT_RE.test(ua);
}
