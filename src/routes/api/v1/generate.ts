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
 * 文本 → 同步生成 deck：请求内 await 跑完管线后返回 { job_id, status, result }。
 * 同步实现保证 Cloudflare Workers 可靠（生成耗时主要为 LLM I/O，不计 CPU 时间）。
 * job 记录保留，GET /v1/jobs/{id} 仍可查。批量/超长任务的异步化（Cloudflare
 * Workflows）列为未来升级项。
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

  // 同步执行：在请求内 await 跑完管线（CF 可靠、本地可测，见 docs/PRD.md §7）。
  // 生成耗时几乎全是等 LLM 的 I/O（不计 CPU 时间），Workers 支持。
  // job 记录仍保留，GET /v1/jobs/{id} 可查；未来批量/超长任务再升级为 Workflow。
  try {
    await setRunning(job.id);
    const deck = await generateDeck({ userId, input, title, brandId, ctx });
    const result = {
      deck_id: deck.id,
      slug: deck.slug,
      slides: deck.slides.length,
    };
    await setSucceeded(job.id, result);
    return v1Json({
      job_id: job.id,
      status: 'succeeded',
      result,
      poll: `/api/v1/jobs/${job.id}`,
    });
  } catch (e) {
    const error = {
      code: 'generation_failed',
      message: (e as Error).message?.slice(0, 500) ?? 'unknown error',
    };
    await setFailed(job.id, error);
    return v1Json({ job_id: job.id, status: 'failed', error });
  }
}

export const Route = createFileRoute('/api/v1/generate')({
  server: { handlers: { POST } },
});
