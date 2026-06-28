import * as crypto from 'crypto';
import { and, count, eq, isNull, like, type SQL } from 'drizzle-orm';

import { db } from '@/core/db';
import { apikey } from '@/config/db/schema';
import { getUuid } from '@/lib/hash';
import { v1Error } from '@/lib/v1';

const KEY_PREFIX = 'hd_live_';
const KEY_PREVIEW_LEN = 8; // chars of randomness shown in the prefix

function hashKey(key: string): string {
  return crypto.createHash('sha256').update(key, 'utf8').digest('hex');
}

function generateKey(): { key: string; keyHash: string; keyPrefix: string } {
  // 32 random bytes → ~43 chars base64url, plus the literal "hd_live_" prefix
  const rand = crypto.randomBytes(32).toString('base64url');
  const key = `${KEY_PREFIX}${rand}`;
  return {
    key,
    keyHash: hashKey(key),
    // Stored so the user can identify the key in the list UI without us
    // having to keep the plaintext around.
    keyPrefix: `${KEY_PREFIX}${rand.slice(0, KEY_PREVIEW_LEN)}`,
  };
}

/**
 * Create a new API key for a user. The plaintext `key` is returned ONCE here
 * — it is never persisted (only the sha256 hash is stored).
 */
export async function create(params: {
  userId: string;
  title: string;
}): Promise<{ id: string; key: string; title: string }> {
  const { userId, title } = params;
  const { key, keyHash, keyPrefix } = generateKey();

  const [row] = await db()
    .insert(apikey)
    .values({
      id: getUuid(),
      userId,
      keyHash,
      keyPrefix,
      title,
      status: 'active',
    })
    .returning();

  return { id: row.id, key, title: row.title };
}

/**
 * List active API keys for a user with pagination and optional search on title.
 * Only the prefix is returned — full keys are never readable after creation.
 */
export async function list(
  userId: string,
  page = 1,
  pageSize = 10,
  search?: string
) {
  const conditions: SQL[] = [
    eq(apikey.userId, userId),
    eq(apikey.status, 'active'),
    isNull(apikey.deletedAt) as unknown as SQL,
  ];
  if (search) {
    conditions.push(like(apikey.title, `%${search}%`));
  }
  const where = and(...conditions);

  const [totalResult] = await db()
    .select({ count: count() })
    .from(apikey)
    .where(where);

  const items = await db()
    .select({
      id: apikey.id,
      keyPrefix: apikey.keyPrefix,
      title: apikey.title,
      status: apikey.status,
      createdAt: apikey.createdAt,
    })
    .from(apikey)
    .where(where)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return { items, total: totalResult.count };
}

/**
 * Delete (soft) an API key.
 */
export async function remove(params: { userId: string; keyId: string }) {
  const { userId, keyId } = params;

  await db()
    .update(apikey)
    .set({ status: 'deleted', deletedAt: new Date() })
    .where(and(eq(apikey.id, keyId), eq(apikey.userId, userId)));
}

/**
 * Validate an API key. Returns the userId if valid, null otherwise.
 */
export async function validate(key: string): Promise<string | null> {
  if (!key) return null;
  const keyHash = hashKey(key);
  const [row] = await db()
    .select({ userId: apikey.userId })
    .from(apikey)
    .where(
      and(
        eq(apikey.keyHash, keyHash),
        eq(apikey.status, 'active'),
        isNull(apikey.deletedAt)
      )
    )
    .limit(1);

  return row?.userId ?? null;
}

/**
 * `/api/v1` 公共 API 鉴权：从 `Authorization: Bearer hd_live_...` 取 key 并校验。
 * 成功返回 `{ userId }`，失败返回标准 v1 错误 Response（调用方直接 return）。
 */
export async function requireApiKey(
  request: Request
): Promise<{ userId: string } | Response> {
  const authz = request.headers.get('authorization') ?? '';
  const match = authz.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return v1Error(
      'invalid_key',
      'Missing or malformed Authorization header. Expected: Bearer hd_live_...',
      401
    );
  }
  const userId = await validate(match[1].trim());
  if (!userId) {
    return v1Error(
      'invalid_key',
      'API key is missing, invalid, or revoked',
      401
    );
  }
  return { userId };
}
