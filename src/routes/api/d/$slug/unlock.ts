import { createFileRoute } from '@tanstack/react-router';

import { getPublishedDeckBySlug } from '@/modules/deck/deck.service';
import { signAccessToken, verifyDeckPassword } from '@/lib/deck-password';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr } from '@/lib/resp';

const WEEK_SECONDS = 7 * 24 * 60 * 60;

/** POST /api/d/{slug}/unlock — 校验密码，成功下发解锁 cookie。公开、无需登录。 */
async function POST({
  request,
  params,
}: {
  request: Request;
  params: { slug: string };
}) {
  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: 1000,
    keyPrefix: 'deck-unlock',
    extraKey: params.slug,
    ignoreCookie: true,
  });
  if (limited) return limited;

  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return respErr('Invalid JSON');
  }
  const password = typeof body.password === 'string' ? body.password : '';

  const deck = await getPublishedDeckBySlug(params.slug);
  // 统一错误：不区分 deck 不存在 / 非密码 / 密码错
  if (!deck || deck.visibility !== 'password' || !deck.passwordHash) {
    return respErr('密码错误');
  }
  const ok = await verifyDeckPassword(password, deck.passwordHash);
  if (!ok) return respErr('密码错误');

  const token = await signAccessToken(deck.id, WEEK_SECONDS);
  const res = respData({ ok: true });
  const secure = process.env.NODE_ENV === 'production' ? ' Secure;' : '';
  res.headers.append(
    'set-cookie',
    `deck_access_${deck.id}=${token}; Path=/; Max-Age=${WEEK_SECONDS}; HttpOnly;${secure} SameSite=Lax`
  );
  return res;
}

export const Route = createFileRoute('/api/d/$slug/unlock')({
  server: { handlers: { POST } },
});
