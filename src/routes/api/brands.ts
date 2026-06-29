import { createFileRoute } from '@tanstack/react-router';

import {
  createBrand,
  listBrands,
  toApiBrand,
} from '@/modules/deck/brand.service';
import { respData, respErr } from '@/lib/resp';
import { requireSession } from '@/lib/session';

async function GET({ request }: { request: Request }) {
  const auth = await requireSession(request);
  if (auth instanceof Response) return auth;
  return respData((await listBrands(auth.userId)).map(toApiBrand));
}

async function POST({ request }: { request: Request }) {
  const auth = await requireSession(request);
  if (auth instanceof Response) return auth;
  let body: any;
  try {
    body = await request.json();
  } catch {
    return respErr('Invalid JSON');
  }
  if (typeof body?.name !== 'string' || !body.name.trim())
    return respErr('name required');
  const b = await createBrand(auth.userId, {
    name: body.name.trim(),
    palette: body.palette ?? null,
    typography: body.typography ?? null,
    tone: body.tone ?? null,
  });
  return respData(toApiBrand(b));
}

export const Route = createFileRoute('/api/brands')({
  server: { handlers: { GET, POST } },
});
