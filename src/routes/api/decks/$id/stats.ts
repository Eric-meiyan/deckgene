import { createFileRoute } from '@tanstack/react-router';

import { getDeckStats } from '@/modules/deck/deck.service';
import { respData, respErr } from '@/lib/resp';
import { requireSession } from '@/lib/session';

/** GET /api/decks/{id}/stats — 所有者读浏览统计。 */
async function GET({
  request,
  params,
}: {
  request: Request;
  params: { id: string };
}) {
  const auth = await requireSession(request);
  if (auth instanceof Response) return auth;
  const stats = await getDeckStats(params.id, auth.userId);
  if (!stats) return respErr('Deck not found');
  return respData(stats);
}

export const Route = createFileRoute('/api/decks/$id/stats')({
  server: { handlers: { GET } },
});
