import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { getDeckWithSlides } from '@/modules/deck/deck.service';
import { deckToPptx } from '@/modules/deck/export.service';
import { respErr } from '@/lib/resp';
import { requireSession } from '@/lib/session';

/**
 * GET /api/decks/{id}/export?format=pptx — 导出 deck（见 docs/PRD.md §9.9）。
 * 免费（不扣 credits）。PDF 走 Browser Rendering（待配置）。
 */
async function GET({
  request,
  params,
}: {
  request: Request;
  params: { id: string };
}) {
  const auth = await requireSession(request);
  if (auth instanceof Response) return auth;

  const format = new URL(request.url).searchParams.get('format') ?? 'pptx';
  const deck = await getDeckWithSlides(params.id, auth.userId);
  if (!deck) return respErr('Deck not found');

  // 取关联品牌（用于上色/字体）
  let brand: { palette?: any; typography?: any } | undefined;
  if (deck.brandId) {
    const { getBrand } = await import('@/modules/deck/brand.service');
    const b = await getBrand(deck.brandId, auth.userId);
    if (b) brand = { palette: b.palette, typography: b.typography };
  }

  if (format === 'pptx') {
    const buf = await deckToPptx(deck, brand);
    const safe = deck.slug || 'deck';
    return new Response(buf, {
      status: 200,
      headers: {
        'content-type':
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'content-disposition': `attachment; filename="${safe}.pptx"`,
      },
    });
  }

  if (format === 'pdf') {
    if (deck.status !== 'published') {
      return respErr('Publish the deck first to export PDF');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const env = (globalThis as any).__CF_ENV__;
    if (!env?.BROWSER) {
      return respErr(
        'PDF export not available (Browser Rendering not configured)'
      );
    }
    const { deckToPdf } = await import('@/modules/deck/export-pdf.service');
    const url = `${envConfigs.app_url}/d/${deck.slug}`;
    const pdf = await deckToPdf(env.BROWSER, url);
    return new Response(pdf as unknown as BodyInit, {
      status: 200,
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': `attachment; filename="${deck.slug}.pdf"`,
      },
    });
  }

  return respErr(`unsupported format: ${format}`);
}

export const Route = createFileRoute('/api/decks/$id/export')({
  server: { handlers: { GET } },
});
