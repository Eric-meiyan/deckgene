import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { setDeckShare, toApiDeck } from '@/modules/deck/deck.service';
import { respData, respErr } from '@/lib/resp';
import { requireSession } from '@/lib/session';

/** PATCH /api/decks/{id}/share — 设置/移除分享密码。body: { password?: string|null } */
async function PATCH({
  request,
  params,
}: {
  request: Request;
  params: { id: string };
}) {
  const auth = await requireSession(request);
  if (auth instanceof Response) return auth;

  let body: { password?: string | null };
  try {
    body = await request.json();
  } catch {
    return respErr('Invalid JSON');
  }
  const password =
    typeof body.password === 'string' && body.password.length > 0
      ? body.password
      : null;

  const d = await setDeckShare(params.id, auth.userId, { password });
  if (!d) return respErr('Deck not found');
  return respData(toApiDeck(d, envConfigs.app_url));
}

export const Route = createFileRoute('/api/decks/$id/share')({
  server: { handlers: { PATCH } },
});
