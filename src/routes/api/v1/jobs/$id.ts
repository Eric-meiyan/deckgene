import { createFileRoute } from '@tanstack/react-router';

import { requireApiKey } from '@/modules/apikeys/service';
import { getJob } from '@/modules/deck/job.service';
import { v1Error, v1Json } from '@/lib/v1';

/**
 * GET /api/v1/jobs/{id}  (见 docs/PRD.md §9.2)
 * 轮询异步任务（建议间隔 2s）。userId 隔离：非本人 job 返回 404（不泄露存在性）。
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

  const job = await getJob(params.id, auth.userId);
  if (!job) return v1Error('not_found', 'Job not found', 404);

  return v1Json({
    id: job.id,
    type: job.type,
    status: job.status,
    result: job.result ?? null,
    error: job.error ?? null,
    created_at: job.createdAt,
    updated_at: job.updatedAt,
  });
}

export const Route = createFileRoute('/api/v1/jobs/$id')({
  server: { handlers: { GET } },
});
