import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { listDecksWithCover, toApiDeck } from '@/modules/deck/deck.service';
import { respData } from '@/lib/resp';
import { requireSession } from '@/lib/session';

// 控制台：列出当前用户的 decks（含首页缩略图）
async function GET({ request }: { request: Request }) {
  const auth = await requireSession(request);
  if (auth instanceof Response) return auth;
  const decks = await listDecksWithCover(auth.userId);
  return respData(
    decks.map((d) => ({
      ...toApiDeck(d, envConfigs.app_url),
      cover: d.cover,
      views: d.views,
    }))
  );
}

export const Route = createFileRoute('/api/decks')({
  server: { handlers: { GET } },
});
