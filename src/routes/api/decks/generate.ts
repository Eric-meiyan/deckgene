import { createFileRoute } from '@tanstack/react-router';

import { generateDeck } from '@/modules/deck/generation.service';
import { fetchUrlText } from '@/lib/fetch-text';
import { respData, respErr } from '@/lib/resp';
import { requireSession } from '@/lib/session';

// 控制台 AI Draft：从文本 / 网址 同步生成一个 deck
async function POST({ request }: { request: Request }) {
  const auth = await requireSession(request);
  if (auth instanceof Response) return auth;
  let body: any;
  try {
    body = await request.json();
  } catch {
    return respErr('Invalid JSON');
  }

  let input = typeof body?.input === 'string' ? body.input.trim() : '';
  let title = typeof body?.title === 'string' ? body.title : undefined;

  // 网址输入：抓取正文作为 input
  if (!input && typeof body?.url === 'string' && body.url.trim()) {
    try {
      const { text, title: pageTitle } = await fetchUrlText(body.url.trim());
      input = text;
      title = title || pageTitle;
    } catch (e) {
      return respErr(`url: ${(e as Error).message}`);
    }
  }

  if (!input) return respErr('input or url is required');
  try {
    const deck = await generateDeck({
      userId: auth.userId,
      input: input.slice(0, 8000),
      title,
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
