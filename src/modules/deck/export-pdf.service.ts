import puppeteer from '@cloudflare/puppeteer';

/**
 * 用 Cloudflare Browser Rendering 把已发布 deck 的 live 页打印成 PDF。
 * 仅在 Workers 上可用（需 BROWSER binding）。一页一张幻灯片由渲染页的
 * break-after-page 控制（见 deck-renderer）。
 */
export async function deckToPdf(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  browserBinding: any,
  url: string
): Promise<Uint8Array> {
  const browser = await puppeteer.launch(browserBinding);
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    const pdf = await page.pdf({
      printBackground: true,
      landscape: true,
      format: 'A4',
      margin: { top: '0.3in', bottom: '0.3in', left: '0.3in', right: '0.3in' },
    });
    return pdf as Uint8Array;
  } finally {
    await browser.close();
  }
}
