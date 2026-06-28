import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { requireApiKey } from '@/modules/apikeys/service';
import {
  getSlideTemplate,
  listSlideTemplatesCompact,
} from '@/modules/deck/templates/registry';
import { v1Error, v1Json } from '@/lib/v1';

/**
 * GET /api/v1/slide-templates  (见 docs/PRD.md §6.4 / §9.3)
 * - 无参         → 精简 pick-list（key/name/category/whenToUse）
 * - ?keys=a,b,c  → 指定模板的完整字段 schema（JSON Schema）
 * 免费（不扣 credits）。需 Bearer hd_live_ 鉴权。
 * 与 MCP `list_slide_templates` 同源（§6.6 web/API 对等）。
 */
async function GET({ request }: { request: Request }) {
  const auth = await requireApiKey(request);
  if (auth instanceof Response) return auth;

  const url = new URL(request.url);
  const keysParam = url.searchParams.get('keys');

  // 无 keys → 精简清单
  if (!keysParam) {
    return v1Json({ templates: listSlideTemplatesCompact() });
  }

  // 带 keys → 完整字段 schema
  const wanted = keysParam
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const templates: unknown[] = [];
  const unknown: string[] = [];
  for (const key of wanted) {
    const t = getSlideTemplate(key);
    if (!t) {
      unknown.push(key);
      continue;
    }
    templates.push({
      key: t.key,
      name: t.name,
      category: t.category,
      whenToUse: t.whenToUse,
      schema: z.toJSONSchema(t.schema),
    });
  }

  if (templates.length === 0 && unknown.length > 0) {
    return v1Error(
      'not_found',
      `Unknown slide_type(s): ${unknown.join(', ')}`,
      404
    );
  }

  return v1Json({ templates, unknown });
}

export const Route = createFileRoute('/api/v1/slide-templates')({
  server: { handlers: { GET } },
});
