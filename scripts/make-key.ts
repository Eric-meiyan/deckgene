/**
 * 临时脚本：为指定邮箱的用户生成一个 hd_live_ API key（用于本地测试 /api/v1）。
 * 用法：pnpm exec tsx scripts/with-env.ts tsx scripts/make-key.ts <email>
 */
import * as crypto from 'crypto';
import { eq } from 'drizzle-orm';

import * as schema from '../src/config/db/schema';

async function main() {
  const email = process.argv[2];
  if (!email) throw new Error('usage: make-key.ts <email>');

  const url = process.env.DATABASE_URL!;
  const { drizzle } = await import('drizzle-orm/postgres-js');
  const postgres = (await import('postgres')).default;
  const client = postgres(url, { prepare: false, max: 1, idle_timeout: 10 });
  const db = drizzle({ client });

  const [user] = await db
    .select()
    .from(schema.user)
    .where(eq(schema.user.email, email))
    .limit(1);
  if (!user) throw new Error(`no user with email ${email}`);

  const rand = crypto.randomBytes(32).toString('base64url');
  const key = `hd_live_${rand}`;
  const keyHash = crypto.createHash('sha256').update(key, 'utf8').digest('hex');
  const keyPrefix = `hd_live_${rand.slice(0, 8)}`;

  await db.insert(schema.apikey).values({
    id: crypto.randomUUID(),
    userId: user.id,
    keyHash,
    keyPrefix,
    title: 'local-test',
    status: 'active',
  });

  console.log('KEY=' + key);
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
