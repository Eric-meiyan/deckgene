import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { requireApiKey } from '@/modules/apikeys/service';
import {
  deleteDeck,
  getDeckWithSlides,
  toApiDeck,
} from '@/modules/deck/deck.service';
import { v1Error, v1Json } from '@/lib/v1';

/**
 * GET    /api/v1/decks/{id}  — 取单个 deck（含有序 slides）
 * DELETE /api/v1/decks/{id}  — 删除 deck（slides 级联）
 * userId 隔离：非本人返回 404。
 */
async function GET({
  request,
  params,
}: {
  request: Request;
  params: { id: string };
}) {
  const auth = await requireApiKey(request);
  if (auth instanceof Response) return auth;

  const deck = await getDeckWithSlides(params.id, auth.userId);
  if (!deck) return v1Error('not_found', 'Deck not found', 404);

  return v1Json(toApiDeck(deck, envConfigs.app_url, deck.slides));
}

async function DELETE({
  request,
  params,
}: {
  request: Request;
  params: { id: string };
}) {
  const auth = await requireApiKey(request);
  if (auth instanceof Response) return auth;

  const ok = await deleteDeck(params.id, auth.userId);
  if (!ok) return v1Error('not_found', 'Deck not found', 404);
  return v1Json({ deleted: true });
}

export const Route = createFileRoute('/api/v1/decks/$id')({
  server: { handlers: { GET, DELETE } },
});
