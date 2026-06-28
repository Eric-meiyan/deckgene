import { createFileRoute } from '@tanstack/react-router';

import type { ProviderContext } from '@/modules/ai/providers';
import { requireApiKey } from '@/modules/apikeys/service';
import { generateDeck } from '@/modules/deck/generation.service';
import {
  createJob,
  setFailed,
  setRunning,
  setSucceeded,
} from '@/modules/deck/job.service';
import { v1Error, v1Json } from '@/lib/v1';

const MAX_INPUT = 8000;
const DECK_CREDITS = 100;

/**
 * POST /api/v1/generate  (见 docs/PRD.md §9.1)
 * 文本 → 异步生成 deck。立即返回 202 + job，客户端轮询 GET /api/v1/jobs/{id}。
 * 本地为 fire-and-forget；部署 CF 时改为触发 Cloudflare Workflow（waitUntil）。
 */
async function POST({ request }: { request: Request }) {
  const auth = await requireApiKey(request);
  if (auth instanceof Response) return auth;
  const { userId } = auth;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return v1Error('invalid_input', 'Body must be valid JSON', 400);
  }

  const input = typeof body?.input === 'string' ? body.input.trim() : '';
  if (!input) {
    return v1Error('invalid_input', '`input` is required', 400);
  }
  if (input.length > MAX_INPUT) {
    return v1Error(
      'invalid_input',
      `\`input\` exceeds ${MAX_INPUT} characters`,
      400
    );
  }

  const brandId =
    typeof body?.brand_id === 'string' ? body.brand_id : undefined;
  const title = typeof body?.title === 'string' ? body.title : undefined;
  const ctx: ProviderContext | undefined = body?.byok
    ? { provider: body.byok.provider, apiKey: body.byok.api_key }
    : undefined;
  // TODO(P2): persist:false（ephemeral 零留存）—— 当前始终落库。

  // 预扣 credits 记录（TODO P3：实际扣费 + 失败退还，接 ShipAny credits 模块）
  const job = await createJob({
    userId,
    type: 'generate',
    input: { input, brand_id: brandId, title },
    creditsHeld: DECK_CREDITS,
  });

  // fire-and-forget：不阻塞响应（CF：用 ctx.waitUntil / Workflow）
  void (async () => {
    try {
      await setRunning(job.id);
      const deck = await generateDeck({
        userId,
        input,
        title,
        brandId,
        ctx,
      });
      await setSucceeded(job.id, {
        deck_id: deck.id,
        slug: deck.slug,
        slides: deck.slides.length,
      });
    } catch (e) {
      await setFailed(job.id, {
        code: 'generation_failed',
        message: (e as Error).message?.slice(0, 500) ?? 'unknown error',
      });
    }
  })();

  return v1Json(
    { job_id: job.id, status: 'queued', poll: `/api/v1/jobs/${job.id}` },
    202
  );
}

export const Route = createFileRoute('/api/v1/generate')({
  server: { handlers: { POST } },
});
