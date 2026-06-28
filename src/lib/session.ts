import { getAuth } from '@/core/auth';
import { respErr } from '@/lib/resp';

/**
 * 控制台 API 的会话鉴权：成功返回 { userId }，失败返回 respErr Response。
 * 用于 /api/decks 等 dashboard 路由（区别于 /api/v1 的 hd_live_ key 鉴权）。
 */
export async function requireSession(
  request: Request
): Promise<{ userId: string } | Response> {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session?.user) return respErr('Unauthorized');
  return { userId: session.user.id };
}
