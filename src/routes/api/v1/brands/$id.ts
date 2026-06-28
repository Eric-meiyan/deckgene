import { createFileRoute } from '@tanstack/react-router';

import { requireApiKey } from '@/modules/apikeys/service';
import {
  deleteBrand,
  getBrand,
  toApiBrand,
  updateBrand,
} from '@/modules/deck/brand.service';
import { v1Error, v1Json } from '@/lib/v1';

/**
 * GET / PATCH / DELETE /api/v1/brands/{id}  — userId 隔离 404。
 */
async function GET({
  request,
  params,
}: {
  request: Request;
  params: { id: string };
}) {
  const auth = await requireApiKey(request);
  if (auth instanceof Response) return auth;
  const b = await getBrand(params.id, auth.userId);
  if (!b) return v1Error('not_found', 'Brand not found', 404);
  return v1Json(toApiBrand(b));
}

async function PATCH({
  request,
  params,
}: {
  request: Request;
  params: { id: string };
}) {
  const auth = await requireApiKey(request);
  if (auth instanceof Response) return auth;
  let body: any;
  try {
    body = await request.json();
  } catch {
    return v1Error('invalid_input', 'Body must be valid JSON', 400);
  }
  const b = await updateBrand(params.id, auth.userId, {
    name: body.name,
    palette: body.palette,
    typography: body.typography,
    tone: body.tone,
    logoUrl: body.logo_url,
  });
  if (!b) return v1Error('not_found', 'Brand not found', 404);
  return v1Json(toApiBrand(b));
}

async function DELETE({
  request,
  params,
}: {
  request: Request;
  params: { id: string };
}) {
  const auth = await requireApiKey(request);
  if (auth instanceof Response) return auth;
  const ok = await deleteBrand(params.id, auth.userId);
  if (!ok) return v1Error('not_found', 'Brand not found', 404);
  return v1Json({ deleted: true });
}

export const Route = createFileRoute('/api/v1/brands/$id')({
  server: { handlers: { GET, PATCH, DELETE } },
});
