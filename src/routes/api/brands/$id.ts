import { createFileRoute } from '@tanstack/react-router';

import {
  deleteBrand,
  toApiBrand,
  updateBrand,
} from '@/modules/deck/brand.service';
import { respData, respErr } from '@/lib/resp';
import { requireSession } from '@/lib/session';

async function PATCH({
  request,
  params,
}: {
  request: Request;
  params: { id: string };
}) {
  const auth = await requireSession(request);
  if (auth instanceof Response) return auth;
  let body: any;
  try {
    body = await request.json();
  } catch {
    return respErr('Invalid JSON');
  }
  const b = await updateBrand(params.id, auth.userId, {
    name: body.name,
    palette: body.palette,
    typography: body.typography,
    tone: body.tone,
    logoUrl: body.logo_url,
  });
  if (!b) return respErr('Brand not found');
  return respData(toApiBrand(b));
}

async function DELETE({
  request,
  params,
}: {
  request: Request;
  params: { id: string };
}) {
  const auth = await requireSession(request);
  if (auth instanceof Response) return auth;
  const ok = await deleteBrand(params.id, auth.userId);
  if (!ok) return respErr('Brand not found');
  return respData({ deleted: true });
}

export const Route = createFileRoute('/api/brands/$id')({
  server: { handlers: { PATCH, DELETE } },
});
