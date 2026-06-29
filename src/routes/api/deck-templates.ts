import { createFileRoute } from '@tanstack/react-router';

import { listDeckTemplates } from '@/modules/deck/templates/deck-templates';
import { respData } from '@/lib/resp';
import { requireSession } from '@/lib/session';

// 控制台：列出 deck 级模板（含页数 + 页型,供卡片预览）
async function GET({ request }: { request: Request }) {
  const auth = await requireSession(request);
  if (auth instanceof Response) return auth;
  return respData(
    listDeckTemplates().map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      category: t.category,
      slide_count: t.slides.length,
      slide_types: t.slides.map((s) => s.slideType),
    }))
  );
}

export const Route = createFileRoute('/api/deck-templates')({
  server: { handlers: { GET } },
});
