import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import {
  deleteDeck,
  getDeckWithSlides,
  setDeckBrand,
  toApiDeck,
} from '@/modules/deck/deck.service';
import { respData, respErr } from '@/lib/resp';
import { requireSession } from '@/lib/session';

async function GET({
  request,
  params,
}: {
  request: Request;
  params: { id: string };
}) {
  const auth = await requireSession(request);
  if (auth instanceof Response) return auth;
  const d = await getDeckWithSlides(params.id, auth.userId);
  if (!d) return respErr('Deck not found');
  return respData(toApiDeck(d, envConfigs.app_url, d.slides));
}

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
  if (!('brand_id' in (body ?? {}))) return respErr('brand_id required');
  const brandId =
    typeof body.brand_id === 'string' && body.brand_id ? body.brand_id : null;
  // 校验品牌归属
  if (brandId) {
    const { getBrand } = await import('@/modules/deck/brand.service');
    const b = await getBrand(brandId, auth.userId);
    if (!b) return respErr('Brand not found');
  }
  const d = await setDeckBrand(params.id, auth.userId, brandId);
  if (!d) return respErr('Deck not found');
  return respData(toApiDeck(d, envConfigs.app_url));
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
  const ok = await deleteDeck(params.id, auth.userId);
  if (!ok) return respErr('Deck not found');
  return respData({ deleted: true });
}

export const Route = createFileRoute('/api/decks/$id')({
  server: { handlers: { GET, PATCH, DELETE } },
});
