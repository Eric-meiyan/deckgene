import { createFileRoute } from '@tanstack/react-router';

import { requireApiKey } from '@/modules/apikeys/service';
import {
  createBrand,
  listBrands,
  toApiBrand,
} from '@/modules/deck/brand.service';
import { v1Error, v1Json } from '@/lib/v1';

/**
 * GET  /api/v1/brands       — 列出品牌
 * POST /api/v1/brands       — 创建品牌（手动）
 */
async function GET({ request }: { request: Request }) {
  const auth = await requireApiKey(request);
  if (auth instanceof Response) return auth;
  const brands = await listBrands(auth.userId);
  return v1Json({ brands: brands.map(toApiBrand) });
}

async function POST({ request }: { request: Request }) {
  const auth = await requireApiKey(request);
  if (auth instanceof Response) return auth;
  let body: any;
  try {
    body = await request.json();
  } catch {
    return v1Error('invalid_input', 'Body must be valid JSON', 400);
  }
  if (typeof body?.name !== 'string' || !body.name.trim()) {
    return v1Error('invalid_input', '`name` is required', 400);
  }
  const b = await createBrand(auth.userId, {
    name: body.name.trim(),
    palette: body.palette ?? null,
    typography: body.typography ?? null,
    tone: body.tone ?? null,
    logoUrl: body.logo_url ?? null,
  });
  return v1Json(toApiBrand(b), 201);
}

export const Route = createFileRoute('/api/v1/brands')({
  server: { handlers: { GET, POST } },
});
