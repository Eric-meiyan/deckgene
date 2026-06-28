import { createFileRoute } from '@tanstack/react-router';

import { requireApiKey } from '@/modules/apikeys/service';
import { setActiveBrand, toApiBrand } from '@/modules/deck/brand.service';
import { v1Error, v1Json } from '@/lib/v1';

/**
 * POST /api/v1/brands/set-active  body { brand_id } — 设为工作区默认品牌。
 */
async function POST({ request }: { request: Request }) {
  const auth = await requireApiKey(request);
  if (auth instanceof Response) return auth;
  let body: any;
  try {
    body = await request.json();
  } catch {
    return v1Error('invalid_input', 'Body must be valid JSON', 400);
  }
  if (typeof body?.brand_id !== 'string') {
    return v1Error('invalid_input', '`brand_id` is required', 400);
  }
  const b = await setActiveBrand(body.brand_id, auth.userId);
  if (!b) return v1Error('not_found', 'Brand not found', 404);
  return v1Json(toApiBrand(b));
}

export const Route = createFileRoute('/api/v1/brands/set-active')({
  server: { handlers: { POST } },
});
