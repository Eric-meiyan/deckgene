import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { requireApiKey } from '@/modules/apikeys/service';
import { toApiDeck, unpublishDeck } from '@/modules/deck/deck.service';
import { v1Error, v1Json } from '@/lib/v1';

/**
 * POST /api/v1/decks/{id}/unpublish  — 回 draft，live URL 立即停止解析。
 */
async function POST({
  request,
  params,
}: {
  request: Request;
  params: { id: string };
}) {
  const auth = await requireApiKey(request);
  if (auth instanceof Response) return auth;

  const deck = await unpublishDeck(params.id, auth.userId);
  if (!deck) return v1Error('not_found', 'Deck not found', 404);
  return v1Json(toApiDeck(deck, envConfigs.app_url));
}

export const Route = createFileRoute('/api/v1/decks/$id/unpublish')({
  server: { handlers: { POST } },
});
