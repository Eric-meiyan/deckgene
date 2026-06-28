import { createFileRoute } from '@tanstack/react-router';

import { reorderSlides } from '@/modules/deck/deck.service';
import { respData, respErr } from '@/lib/resp';
import { requireSession } from '@/lib/session';

async function POST({
  request,
  params,
}: {
  request: Request;
  params: { id: string };
}) {
  const auth = await requireSession(request);
  if (auth instanceof Response) return auth;
  let body: any;
  try {
    body = await request.json();
  } catch {
    return respErr('Invalid JSON');
  }
  if (!Array.isArray(body?.ordered_slide_ids)) {
    return respErr('ordered_slide_ids required');
  }
  const ok = await reorderSlides(
    params.id,
    auth.userId,
    body.ordered_slide_ids
  );
  if (!ok) return respErr('Deck not found');
  return respData({ ok: true });
}

export const Route = createFileRoute('/api/decks/$id/slides/reorder')({
  server: { handlers: { POST } },
});
