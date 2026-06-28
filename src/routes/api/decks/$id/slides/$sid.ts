import { createFileRoute } from '@tanstack/react-router';

import { deleteSlide, updateSlide } from '@/modules/deck/deck.service';
import { respData, respErr } from '@/lib/resp';
import { requireSession } from '@/lib/session';

async function PATCH({
  request,
  params,
}: {
  request: Request;
  params: { id: string; sid: string };
}) {
  const auth = await requireSession(request);
  if (auth instanceof Response) return auth;
  let body: any;
  try {
    body = await request.json();
  } catch {
    return respErr('Invalid JSON');
  }
  try {
    const s = await updateSlide(params.id, params.sid, auth.userId, {
      content: body.content,
      notes: body.notes,
    });
    if (!s) return respErr('Slide not found');
    return respData(s);
  } catch (e) {
    return respErr((e as Error).message);
  }
}

async function DELETE({
  request,
  params,
}: {
  request: Request;
  params: { id: string; sid: string };
}) {
  const auth = await requireSession(request);
  if (auth instanceof Response) return auth;
  const ok = await deleteSlide(params.id, params.sid, auth.userId);
  if (!ok) return respErr('Slide not found');
  return respData({ deleted: true });
}

export const Route = createFileRoute('/api/decks/$id/slides/$sid')({
  server: { handlers: { PATCH, DELETE } },
});
