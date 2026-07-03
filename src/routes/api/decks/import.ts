import { createFileRoute } from '@tanstack/react-router';

import { createDeckWithSlides } from '@/modules/deck/deck.service';
import { parsePortableDeck } from '@/modules/deck/portable.service';
import { respData, respErr } from '@/lib/resp';
import { requireSession } from '@/lib/session';

/**
 * POST /api/decks/import — 导入 deckgene 原生可移植包（.deckgene.json）。
 * body = 导出的 PortableDeck JSON。逐页 zod 校验，非法/未知页型跳过。
 * 为当前用户新建 deck（+ 若带 brand 则新建 brand 并关联）。
 */
async function POST({ request }: { request: Request }) {
  const auth = await requireSession(request);
  if (auth instanceof Response) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return respErr('Invalid JSON');
  }

  const parsed = parsePortableDeck(body);
  if (!parsed.ok) return respErr(parsed.error);
  const { title, locale, brand, slides, skipped } = parsed.data;

  // 带品牌则在当前用户空间新建一个 brand 并关联（不复用/不覆盖已有品牌）
  let brandId: string | null = null;
  if (brand) {
    const { createBrand } = await import('@/modules/deck/brand.service');
    const b = await createBrand(auth.userId, {
      name: brand.name,
      palette: brand.palette ?? null,
      typography: brand.typography ?? null,
      tone: brand.tone ?? null,
      logoUrl: brand.logo_url ?? null,
    });
    brandId = b.id;
  }

  const deck = await createDeckWithSlides({
    userId: auth.userId,
    title,
    locale,
    brandId,
    slides,
  });

  return respData({
    deck_id: deck.id,
    imported: slides.length,
    skipped,
  });
}

export const Route = createFileRoute('/api/decks/import')({
  server: { handlers: { POST } },
});
