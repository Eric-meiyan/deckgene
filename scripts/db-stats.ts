/**
 * 统计数据库概况（用户/deck/品牌数）。
 * 用法：DATABASE_PROVIDER=postgresql DATABASE_URL="<neon>" pnpm exec tsx scripts/db-stats.ts
 */
async function main() {
  const url = process.env.DATABASE_URL!;
  const { default: postgres } = await import('postgres');
  const c = postgres(url, { prepare: false, max: 1, idle_timeout: 5 });
  const [u] = await c`select count(*)::int as n from "user"`;
  const [d] = await c`select count(*)::int as n from "deck"`;
  const [b] = await c`select count(*)::int as n from "brand"`;
  const recent =
    await c`select email, created_at from "user" order by created_at desc limit 10`;
  console.log('用户数:', u.n);
  console.log('deck 数:', d.n);
  console.log('品牌数:', b.n);
  console.log('最近用户:');
  for (const r of recent) console.log('  -', r.email, r.created_at);
  await c.end();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
