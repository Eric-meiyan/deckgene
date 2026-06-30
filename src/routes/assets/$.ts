import { createFileRoute } from '@tanstack/react-router';

// 从 R2 提供资源（公开可读，用于 <img src="/assets/{key}">）。
async function GET({ params }: { params: { _splat?: string } }) {
  const key = params._splat;
  if (!key) return new Response('not found', { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const env = (globalThis as any).__CF_ENV__;
  if (!env?.R2) return new Response('storage not configured', { status: 500 });

  const obj = await env.R2.get(key);
  if (!obj) return new Response('not found', { status: 404 });

  const headers = new Headers();
  headers.set(
    'content-type',
    obj.httpMetadata?.contentType || 'application/octet-stream'
  );
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  return new Response(obj.body, { headers });
}

export const Route = createFileRoute('/assets/$')({
  server: { handlers: { GET } },
});
