import { createFileRoute } from '@tanstack/react-router';

import {
  getPublishedDeckBySlug,
  recordDeckView,
} from '@/modules/deck/deck.service';
import { isBot } from '@/lib/bot-filter';
import { getCookieFromHeader } from '@/lib/cookie';
import { getUuid } from '@/lib/hash';
import { respData } from '@/lib/resp';

const YEAR_SECONDS = 365 * 24 * 60 * 60;

/** POST /api/d/{slug}/view — 记录一次浏览。公开、无需登录。 */
async function POST({
  request,
  params,
}: {
  request: Request;
  params: { slug: string };
}) {
  // bot 过滤
  if (isBot(request.headers.get('user-agent'))) return respData({ ok: true });

  const deck = await getPublishedDeckBySlug(params.slug);
  if (!deck) return respData({ ok: true });

  // 匿名访客 cookie
  let visitorId = getCookieFromHeader(
    request.headers.get('cookie'),
    'deck_visitor'
  );
  let setCookie = false;
  if (!visitorId) {
    visitorId = getUuid();
    setCookie = true;
  }

  await recordDeckView(deck.id, visitorId);

  const res = respData({ ok: true });
  if (setCookie) {
    const secure = process.env.NODE_ENV === 'production' ? ' Secure;' : '';
    res.headers.append(
      'set-cookie',
      `deck_visitor=${visitorId}; Path=/; Max-Age=${YEAR_SECONDS}; HttpOnly;${secure} SameSite=Lax`
    );
  }
  return res;
}

export const Route = createFileRoute('/api/d/$slug/view')({
  server: { handlers: { POST } },
});
