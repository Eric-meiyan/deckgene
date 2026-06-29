import { createFileRoute } from '@tanstack/react-router';

import { extractBrandFromUrl, toApiBrand } from '@/modules/deck/brand.service';
import { respData, respErr } from '@/lib/resp';
import { requireSession } from '@/lib/session';

// Brand Kernel：从 URL 提取品牌（同步）
async function POST({ request }: { request: Request }) {
  const auth = await requireSession(request);
  if (auth instanceof Response) return auth;
  let body: any;
  try {
    body = await request.json();
  } catch {
    return respErr('Invalid JSON');
  }
  if (typeof body?.url !== 'string') return respErr('url required');
  try {
    const b = await extractBrandFromUrl(auth.userId, body.url);
    return respData(toApiBrand(b));
  } catch (e) {
    return respErr((e as Error).message);
  }
}

export const Route = createFileRoute('/api/brands/extract')({
  server: { handlers: { POST } },
});
