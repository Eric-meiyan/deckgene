import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import {
  deleteDeck,
  getDeckWithSlides,
  toApiDeck,
} from '@/modules/deck/deck.service';
import { respData, respErr } from '@/lib/resp';
import { requireSession } from '@/lib/session';

async function GET({
  request,
  params,
}: {
  request: Request;
  params: { id: string };
}) {
  const auth = await requireSession(request);
  if (auth instanceof Response) return auth;
  const d = await getDeckWithSlides(params.id, auth.userId);
  if (!d) return respErr('Deck not found');
  return respData(toApiDeck(d, envConfigs.app_url, d.slides));
}

async function DELETE({
  request,
  params,
}: {
  request: Request;
  params: { id: string };
}) {
  const auth = await requireSession(request);
  if (auth instanceof Response) return auth;
  const ok = await deleteDeck(params.id, auth.userId);
  if (!ok) return respErr('Deck not found');
  return respData({ deleted: true });
}

export const Route = createFileRoute('/api/decks/$id')({
  server: { handlers: { GET, DELETE } },
});
