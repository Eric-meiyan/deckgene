import { createFileRoute } from '@tanstack/react-router';
import { nanoid } from 'nanoid';

import { respData, respErr } from '@/lib/resp';
import { requireSession } from '@/lib/session';

const MAX_BYTES = 5 * 1024 * 1024; // 5MB

// 上传资源到 R2（logo / 画布图 / 配图）。原始字节 body + ?ext=png。
async function POST({ request }: { request: Request }) {
  const auth = await requireSession(request);
  if (auth instanceof Response) return auth;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const env = (globalThis as any).__CF_ENV__;
  if (!env?.R2) return respErr('storage not configured');

  const ext = (new URL(request.url).searchParams.get('ext') || 'bin')
    .replace(/[^a-z0-9]/gi, '')
    .slice(0, 5);
  const contentType =
    request.headers.get('content-type') || 'application/octet-stream';
  const buf = await request.arrayBuffer();
  if (buf.byteLength === 0) return respErr('empty body');
  if (buf.byteLength > MAX_BYTES) return respErr('file too large (max 5MB)');

  const key = `${auth.userId}/${nanoid(16)}.${ext}`;
  await env.R2.put(key, buf, { httpMetadata: { contentType } });
  return respData({ url: `/assets/${key}`, key });
}

export const Route = createFileRoute('/api/assets')({
  server: { handlers: { POST } },
});
