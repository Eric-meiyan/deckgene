import { createFileRoute } from '@tanstack/react-router';

import { getDeckWithSlides, updateSlide } from '@/modules/deck/deck.service';
import { editSlide } from '@/modules/deck/generation.service';
import { respData, respErr } from '@/lib/resp';
import { requireSession } from '@/lib/session';

// 控制台：单页 AI 改写（扣 10 积分，见 docs/PRD.md §9.4）
async function POST({
  request,
  params,
}: {
  request: Request;
  params: { id: string; sid: string };
}) {
  const auth = await requireSession(request);
  if (auth instanceof Response) return auth;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return respErr('Invalid JSON');
  }
  const instruction =
    typeof body?.instruction === 'string' ? body.instruction.trim() : '';
  if (!instruction) return respErr('instruction required');

  const deck = await getDeckWithSlides(params.id, auth.userId);
  if (!deck) return respErr('Deck not found');
  const sl = deck.slides.find((s) => s.id === params.sid);
  if (!sl) return respErr('Slide not found');

  // 品牌语气（可选）
  let tone: string | undefined;
  if (deck.brandId) {
    const { getBrand } = await import('@/modules/deck/brand.service');
    const b = await getBrand(deck.brandId, auth.userId);
    tone = b?.tone ?? undefined;
  }

  try {
    const content = await editSlide({
      userId: auth.userId,
      slideType: sl.slideType,
      currentContent: (sl.content ?? {}) as Record<string, unknown>,
      instruction,
      deckTitle: deck.title,
      tone,
    });
    const updated = await updateSlide(params.id, params.sid, auth.userId, {
      content,
    });
    if (!updated) return respErr('Slide not found');
    return respData(updated);
  } catch (e) {
    return respErr((e as Error).message);
  }
}

export const Route = createFileRoute('/api/decks/$id/slides/$sid/iterate')({
  server: { handlers: { POST } },
});
