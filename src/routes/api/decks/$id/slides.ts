import { createFileRoute } from '@tanstack/react-router';

import { addSlide } from '@/modules/deck/deck.service';
import { respData, respErr } from '@/lib/resp';
import { requireSession } from '@/lib/session';

// 新增一页
async function POST({
  request,
  params,
}: {
  request: Request;
  params: { id: string };
}) {
  const auth = await requireSession(request);
  if (auth instanceof Response) return auth;
  let body: any;
  try {
    body = await request.json();
  } catch {
    return respErr('Invalid JSON');
  }
  if (typeof body?.slide_type !== 'string')
    return respErr('slide_type required');
  try {
    const s = await addSlide(params.id, auth.userId, {
      slideType: body.slide_type,
      content: body.content ?? {},
      index: body.index,
    });
    if (!s) return respErr('Deck not found');
    return respData(s);
  } catch (e) {
    return respErr((e as Error).message);
  }
}

export const Route = createFileRoute('/api/decks/$id/slides')({
  server: { handlers: { POST } },
});
