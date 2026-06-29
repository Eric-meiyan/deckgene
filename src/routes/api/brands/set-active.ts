import { createFileRoute } from '@tanstack/react-router';

import { setActiveBrand, toApiBrand } from '@/modules/deck/brand.service';
import { respData, respErr } from '@/lib/resp';
import { requireSession } from '@/lib/session';

async function POST({ request }: { request: Request }) {
  const auth = await requireSession(request);
  if (auth instanceof Response) return auth;
  let body: any;
  try {
    body = await request.json();
  } catch {
    return respErr('Invalid JSON');
  }
  if (typeof body?.brand_id !== 'string') return respErr('brand_id required');
  const b = await setActiveBrand(body.brand_id, auth.userId);
  if (!b) return respErr('Brand not found');
  return respData(toApiBrand(b));
}

export const Route = createFileRoute('/api/brands/set-active')({
  server: { handlers: { POST } },
});
