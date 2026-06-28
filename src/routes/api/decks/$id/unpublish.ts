import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { toApiDeck, unpublishDeck } from '@/modules/deck/deck.service';
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
  const d = await unpublishDeck(params.id, auth.userId);
  if (!d) return respErr('Deck not found');
  return respData(toApiDeck(d, envConfigs.app_url));
}

export const Route = createFileRoute('/api/decks/$id/unpublish')({
  server: { handlers: { POST } },
});
