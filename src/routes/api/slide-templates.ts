import { createFileRoute } from '@tanstack/react-router';

import { listSlideTemplatesCompact } from '@/modules/deck/templates/registry';
import { respData } from '@/lib/resp';
import { requireSession } from '@/lib/session';

// 控制台：模板 pick-list（编辑器「新增页」选择器用）
async function GET({ request }: { request: Request }) {
  const auth = await requireSession(request);
  if (auth instanceof Response) return auth;
  return respData(listSlideTemplatesCompact());
}

export const Route = createFileRoute('/api/slide-templates')({
  server: { handlers: { GET } },
});
