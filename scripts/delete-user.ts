/**
 * 删除指定邮箱的用户及其关联数据（测试账号清理）。
 * 用法：DATABASE_PROVIDER=postgresql DATABASE_URL="<neon>" \
 *        pnpm exec tsx scripts/delete-user.ts <email>
 */
import { eq } from 'drizzle-orm';

import * as schema from '../src/config/db/schema';

async function main() {
  const email = process.argv[2];
  if (!email) throw new Error('usage: delete-user.ts <email>');

  const url = process.env.DATABASE_URL!;
  const { drizzle } = await import('drizzle-orm/postgres-js');
  const { default: postgres } = await import('postgres');
  const client = postgres(url, { prepare: false, max: 1, idle_timeout: 5 });
  const db = drizzle({ client });

  const [u] = await db
    .select()
    .from(schema.user)
    .where(eq(schema.user.email, email))
    .limit(1);
  if (!u) throw new Error(`no user: ${email}`);

  // 先删引用 user 的行（部分 FK 无级联），再删 user
  for (const t of [
    schema.deck, // slides 经 deck 级联
    schema.credit,
    schema.apikey,
    schema.userRole,
    schema.session,
    schema.account,
    schema.userInvite,
    schema.brand,
  ]) {
    try {
      await db.delete(t as any).where(eq((t as any).userId, u.id));
    } catch {
      // 某些表可能无 userId 列或无数据，忽略
    }
  }
  await db.delete(schema.user).where(eq(schema.user.id, u.id));

  console.log(`deleted user ${email} and related rows`);
  await client.end();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
