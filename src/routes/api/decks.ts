import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { listDecks, toApiDeck } from '@/modules/deck/deck.service';
import { respData } from '@/lib/resp';
import { requireSession } from '@/lib/session';

// 控制台：列出当前用户的 decks
async function GET({ request }: { request: Request }) {
  const auth = await requireSession(request);
  if (auth instanceof Response) return auth;
  const decks = await listDecks(auth.userId);
  return respData(decks.map((d) => toApiDeck(d, envConfigs.app_url)));
}

export const Route = createFileRoute('/api/decks')({
  server: { handlers: { GET } },
});
