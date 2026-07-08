import { createFileRoute } from '@tanstack/react-router';

import {
  getPublishedDeckBySlug,
  shapePublicDeck,
} from '@/modules/deck/deck.service';
import { getCookieFromHeader } from '@/lib/cookie';
import { verifyAccessToken } from '@/lib/deck-password';
import { respData } from '@/lib/resp';

/** GET /api/d/{slug}/content — 校验解锁 cookie 后返回 password deck 内容。 */
async function GET({
  request,
  params,
}: {
  request: Request;
  params: { slug: string };
}) {
  const deck = await getPublishedDeckBySlug(params.slug);
  if (!deck) return respData({ locked: true });

  // 非密码 deck：本路由不该被调用，但也直接给内容（幂等安全）
  if (deck.visibility !== 'password') {
    const shaped = await shapePublicDeck(deck);
    return respData({ locked: false, ...shaped });
  }

  const token = getCookieFromHeader(
    request.headers.get('cookie'),
    `deck_access_${deck.id}`
  );
  const okAccess = await verifyAccessToken(deck.id, token);
  if (!okAccess) return respData({ locked: true });

  const shaped = await shapePublicDeck(deck);
  return respData({ locked: false, ...shaped });
}

export const Route = createFileRoute('/api/d/$slug/content')({
  server: { handlers: { GET } },
});
