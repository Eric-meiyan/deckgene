import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import { db } from '@/core/db';
import { job, type Job } from '@/config/db/schema';

/**
 * 异步任务（见 docs/PRD.md §5.4 / §9.2）。
 * 生命周期：queued → running → succeeded | failed。失败退还 creditsHeld（P3 接入计费）。
 */

export type JobType = 'generate' | 'image' | 'brand_extract' | 'export';
export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export async function createJob(params: {
  userId: string;
  type: JobType;
  input?: Record<string, unknown>;
  creditsHeld?: number;
}): Promise<Job> {
  const [row] = await db()
    .insert(job)
    .values({
      id: crypto.randomUUID(),
      userId: params.userId,
      type: params.type,
      status: 'queued',
      input: params.input ?? {},
      creditsHeld: params.creditsHeld ?? 0,
    })
    .returning();
  return row;
}

/** 取 job（强制 userId 隔离；非本人返回 null）。 */
export async function getJob(id: string, userId: string): Promise<Job | null> {
  const [row] = await db()
    .select()
    .from(job)
    .where(and(eq(job.id, id), eq(job.userId, userId)))
    .limit(1);
  return row ?? null;
}

export async function setRunning(id: string): Promise<void> {
  await db().update(job).set({ status: 'running' }).where(eq(job.id, id));
}

export async function setSucceeded(
  id: string,
  result: Record<string, unknown>
): Promise<void> {
  await db()
    .update(job)
    .set({ status: 'succeeded', result })
    .where(eq(job.id, id));
}

export async function setFailed(
  id: string,
  error: { code: string; message: string }
): Promise<void> {
  await db().update(job).set({ status: 'failed', error }).where(eq(job.id, id));
}

/** 生成不可猜的 slug（base：标题 kebab + 短随机）。 */
export function makeSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `${base || 'deck'}-${nanoid(8)}`;
}
