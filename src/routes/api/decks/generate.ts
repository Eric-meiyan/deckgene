import { createFileRoute } from '@tanstack/react-router';

import { generateDeck } from '@/modules/deck/generation.service';
import { respData, respErr } from '@/lib/resp';
import { requireSession } from '@/lib/session';

// 控制台：从文本同步生成一个 deck
async function POST({ request }: { request: Request }) {
  const auth = await requireSession(request);
  if (auth instanceof Response) return auth;
  let body: any;
  try {
    body = await request.json();
  } catch {
    return respErr('Invalid JSON');
  }
  const input = typeof body?.input === 'string' ? body.input.trim() : '';
  if (!input) return respErr('input is required');
  try {
    const deck = await generateDeck({
      userId: auth.userId,
      input: input.slice(0, 8000),
      title: typeof body?.title === 'string' ? body.title : undefined,
    });
    return respData({
      deck_id: deck.id,
      slug: deck.slug,
      slides: deck.slides.length,
    });
  } catch (e) {
    return respErr((e as Error).message);
  }
}

export const Route = createFileRoute('/api/decks/generate')({
  server: { handlers: { POST } },
});
