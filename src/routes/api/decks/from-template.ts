import { createFileRoute } from '@tanstack/react-router';

import { createDeckFromTemplate } from '@/modules/deck/deck.service';
import { respData, respErr } from '@/lib/resp';
import { requireSession } from '@/lib/session';

// 控制台：从 deck 级模板创建 deck
async function POST({ request }: { request: Request }) {
  const auth = await requireSession(request);
  if (auth instanceof Response) return auth;
  let body: any;
  try {
    body = await request.json();
  } catch {
    return respErr('Invalid JSON');
  }
  if (typeof body?.template_id !== 'string')
    return respErr('template_id required');
  const deck = await createDeckFromTemplate(auth.userId, body.template_id);
  if (!deck) return respErr('Template not found');
  return respData({ deck_id: deck.id });
}

export const Route = createFileRoute('/api/decks/from-template')({
  server: { handlers: { POST } },
});
