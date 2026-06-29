/**
 * 抓取 URL 并提取正文文本（用于 AI Draft「从网址生成」）。含 SSRF 防护。
 */
export async function fetchUrlText(
  url: string
): Promise<{ text: string; title?: string }> {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    throw new Error('invalid url');
  }
  if (!/^https?:$/.test(u.protocol)) throw new Error('only http(s) allowed');
  if (/^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.)/.test(u.hostname)) {
    throw new Error('blocked host');
  }

  const res = await fetch(u.toString(), {
    headers: { 'user-agent': 'deckgene/1.0' },
  });
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  const html = (await res.text()).slice(0, 1_000_000);

  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim();
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 8000);

  if (text.length < 20) throw new Error('no readable text at url');
  return { text, title };
}
