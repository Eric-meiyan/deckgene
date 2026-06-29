import { createFileRoute } from '@tanstack/react-router';

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

  if (format === 'pptx') {
    const buf = await deckToPptx(deck);
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
    return respErr('PDF export not configured yet (needs Browser Rendering)');
  }

  return respErr(`unsupported format: ${format}`);
}

export const Route = createFileRoute('/api/decks/$id/export')({
  server: { handlers: { GET } },
});
