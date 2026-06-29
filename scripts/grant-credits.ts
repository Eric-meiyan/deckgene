/**
 * 给指定邮箱的用户发放积分（复用 credits.service.grant）。
 * 用法：DATABASE_PROVIDER=postgresql DATABASE_URL="<neon>" \
 *        pnpm exec tsx scripts/grant-credits.ts <email> <amount>
 */
import { eq } from 'drizzle-orm';

import { user } from '../src/config/db/schema';
import { db } from '../src/core/db';
import { grant } from '../src/modules/credits/service';

async function main() {
  const email = process.argv[2];
  const amount = parseInt(process.argv[3] || '0', 10);
  if (!email || !amount)
    throw new Error('usage: grant-credits.ts <email> <amount>');

  const [u] = await db()
    .select()
    .from(user)
    .where(eq(user.email, email))
    .limit(1);
  if (!u) throw new Error(`no user: ${email}`);

  await grant({
    userId: u.id,
    userEmail: email,
    credits: amount,
    scene: 'gift',
    description: 'manual grant',
  });

  console.log(`granted ${amount} credits to ${email}`);
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
