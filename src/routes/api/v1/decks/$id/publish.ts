import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { requireApiKey } from '@/modules/apikeys/service';
import { publishDeck, toApiDeck } from '@/modules/deck/deck.service';
import { v1Error, v1Json } from '@/lib/v1';

/**
 * POST /api/v1/decks/{id}/publish  (见 docs/PRD.md §9.4)
 * 置 published + 生成 publishedAt，返回含 live URL 的 deck。
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

  const deck = await publishDeck(params.id, auth.userId);
  if (!deck) return v1Error('not_found', 'Deck not found', 404);
  return v1Json(toApiDeck(deck, envConfigs.app_url));
}

export const Route = createFileRoute('/api/v1/decks/$id/publish')({
  server: { handlers: { POST } },
});
