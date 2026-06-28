import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { requireApiKey } from '@/modules/apikeys/service';
import { listDecks, toApiDeck } from '@/modules/deck/deck.service';
import { v1Json } from '@/lib/v1';

/**
 * GET /api/v1/decks  (见 docs/PRD.md §9.4) — 列出 deck（免费，不含 slides）。
 */
async function GET({ request }: { request: Request }) {
  const auth = await requireApiKey(request);
  if (auth instanceof Response) return auth;

  const decks = await listDecks(auth.userId);
  return v1Json({
    decks: decks.map((d) => toApiDeck(d, envConfigs.app_url)),
  });
}

export const Route = createFileRoute('/api/v1/decks')({
  server: { handlers: { GET } },
});
