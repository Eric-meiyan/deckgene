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

  // 取关联品牌（pptx 用于上色/字体；json 保留完整品牌）
  let fullBrand = null;
  if (deck.brandId) {
    const { getBrand } = await import('@/modules/deck/brand.service');
    fullBrand = await getBrand(deck.brandId, auth.userId);
  }
  const brand: { palette?: any; typography?: any } | undefined = fullBrand
    ? { palette: fullBrand.palette, typography: fullBrand.typography }
    : undefined;

  // deckgene 原生可移植格式（无损，供另一实例导入）
  if (format === 'json') {
    const { buildPortableDeck } =
      await import('@/modules/deck/portable.service');
    const portable = buildPortableDeck(deck, fullBrand, envConfigs.app_url);
    const safe = deck.slug || 'deck';
    return new Response(JSON.stringify(portable, null, 2), {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'content-disposition': `attachment; filename="${safe}.deckgene.json"`,
      },
    });
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
    try {
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
    } catch (e) {
      return respErr(`pdf failed: ${(e as Error).message?.slice(0, 300)}`);
    }
  }

  return respErr(`unsupported format: ${format}`);
}

export const Route = createFileRoute('/api/decks/$id/export')({
  server: { handlers: { GET } },
});
