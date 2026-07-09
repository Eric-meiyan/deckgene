# Deck 浏览统计 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 deck 所有者看到自己发布的 deck 的总浏览数与独立访客数；计数发生在访客真正看到内容时，用匿名 cookie 去重、30 分钟节流、过滤 bot。

**Architecture:** 客户端在内容显示时打一个信标 `POST /api/d/:slug/view`；该请求式路由读/种匿名 `deck_visitor` cookie、过滤 bot、30 分钟节流后往 `deck_view` 事件表插一行。所有者经 `GET /api/decks/:id/stats` 读聚合。不存 IP / 明文 UA。

**Tech Stack:** TanStack Start（React 19，文件路由），Drizzle ORM（Postgres/MySQL/SQLite 三方言），TanStack Query，Web fetch via `@/lib/api-client`。

## Global Constraints

- 计数只在访客真正看到内容时发生；`deck_view` 只存 `id / deck_id / visitor_id / created_at`，**不存 IP、不存明文 UA**。
- 访客识别用匿名 cookie `deck_visitor`（`getUuid()` 生成，httpOnly，Secure 仅生产，SameSite=Lax，Max-Age 1 年）。
- 节流：同一 `(deckId, visitorId)` **30 分钟**内不重复记录。
- `bot-filter.ts` / `recordDeckView` 为 server-only；stats 接口仅所有者可读，`deck_view` 明细不经任何公开接口返回。
- 数据获取用 `@/lib/api-client` + TanStack Query，无裸 fetch；文案走 i18n（`messages/{en,zh}.json`）。
- 每个任务跑 `pnpm build` 且 `npx tsc --noEmit -p tsconfig.json` 保持 0 错（本仓无单测框架，纯库用可运行断言脚本）。
- 提交信息末尾加 `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`。

---

## File Structure

**新增**

- `src/lib/bot-filter.ts` — `isBot(ua)` 纯函数（server 用，但纯逻辑可测）。
- `scripts/test-deck-analytics.mts` — bot 判定 / 节流判定的可运行断言测试。
- `src/routes/api/d/$slug/view.ts` — 记录浏览的信标接口（公开）。
- `src/routes/api/decks/$id/stats.ts` — 所有者读统计。

**改动**

- `src/config/db/schema.postgres.ts` / `schema.mysql.ts` / `schema.sqlite.ts` / `schema.ts`(active) — 新增 `deck_view` 表。
- `src/modules/deck/deck.service.ts` — `recordDeckView`、`getDeckStats`。
- `src/routes/d/$slug.tsx` — 公开 deck 内容显示后打信标。
- `src/components/deck/deck-password-gate.tsx` — 解锁后内容显示时打信标。
- `src/routes/settings/decks.$id.tsx` — 统计卡片 + i18n。
- `messages/en.json` / `messages/zh.json` — 文案。

---

## Task 1: `deck_view` 表（三方言 + active）+ 本地建表

**Files:**

- Modify: `src/config/db/schema.postgres.ts`, `src/config/db/schema.mysql.ts`, `src/config/db/schema.sqlite.ts`, `src/config/db/schema.ts`

**Interfaces:**

- Produces: 表 `deckView`（`deck_view`），列 `id / deckId / visitorId / createdAt`；类型导出 `DeckView` / `NewDeckView`（若该文件对其它表也导出了 `$inferSelect`/`$inferInsert`，照其风格加）。

- [ ] **Step 1: 在 postgres 模板加表**

在 `src/config/db/schema.postgres.ts` 的 "Custom tables" 区（`deck`/`slide` 附近）加：

```ts
export const deckView = table(
  'deck_view',
  {
    id: text('id').primaryKey(),
    deckId: text('deck_id')
      .notNull()
      .references(() => deck.id, { onDelete: 'cascade' }),
    visitorId: text('visitor_id').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('idx_deck_view_deck_created').on(t.deckId, t.createdAt),
    index('idx_deck_view_deck_visitor').on(t.deckId, t.visitorId),
  ]
);
```

若本文件对其它表导出了强类型（如 `export type Deck = typeof deck.$inferSelect`），照同样风格加：

```ts
export type DeckView = typeof deckView.$inferSelect;
export type NewDeckView = typeof deckView.$inferInsert;
```

- [ ] **Step 2: 在 mysql / sqlite 模板加等价表**

在 `schema.mysql.ts` 和 `schema.sqlite.ts` 的对应位置加同名 `deckView` 表。**列类型照该文件里 `deck` 表已有的写法**（各方言的 `text` / 主键 / `references` / 时间戳 / `index` 用法不同——直接对照本文件 `deck` 表的 `id`、`createdAt`、`.references(...)`、`index(...)` 复制，保持一致）。表名 `deck_view`、列名 `deck_id`/`visitor_id`/`created_at`、两个索引名保持三方言一致。

- [ ] **Step 3: 同步到 active schema.ts**

`src/config/db/schema.ts` 是运行时用的活动副本（当前为 postgres 方言）。把 Step 1 的 `deckView` 表（及类型导出）**原样加到 `schema.ts` 的对应位置**（它的 import/写法与 postgres 模板一致）。

- [ ] **Step 4: 本地建表 + 构建**

Run: `pnpm db:push`
Expected: drizzle 识别到新表 `deck_view` 并在本地库创建，无报错。
Run: `pnpm build`
Expected: 成功。

> 生产库(Neon)的迁移放到 Task 9（部署前 `db:generate` + `db:migrate`），不在此任务。

- [ ] **Step 5: 提交**

```bash
git add src/config/db/schema.postgres.ts src/config/db/schema.mysql.ts src/config/db/schema.sqlite.ts src/config/db/schema.ts
git commit -m "feat(deck): 新增 deck_view 浏览事件表(三方言)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: `bot-filter.ts` + 断言测试

**Files:**

- Create: `src/lib/bot-filter.ts`
- Test: `scripts/test-deck-analytics.mts`

**Interfaces:**

- Produces: `isBot(ua: string | null | undefined): boolean` — 空 UA 或匹配已知爬虫特征 → true。

- [ ] **Step 1: 写断言测试（先失败）**

Create `scripts/test-deck-analytics.mts`:

```ts
// 运行：npx tsx scripts/test-deck-analytics.mts
import assert from 'node:assert/strict';

import { isBot } from '../src/lib/bot-filter.ts';

let n = 0;
const ok = (m: string) => console.log(`  ✓ ${m}`) || n++;

assert.equal(isBot(null), true);
ok('null UA 视为 bot');
assert.equal(isBot(''), true);
ok('空 UA 视为 bot');
assert.equal(isBot('Googlebot/2.1 (+http://www.google.com/bot.html)'), true);
ok('Googlebot');
assert.equal(isBot('Mozilla/5.0 (compatible; bingbot/2.0)'), true);
ok('bingbot');
assert.equal(isBot('curl/8.4.0'), true);
ok('curl');
assert.equal(
  isBot(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
  ),
  false
);
ok('正常 Chrome 不是 bot');
assert.equal(
  isBot(
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'
  ),
  false
);
ok('iPhone Safari 不是 bot');

console.log(`\n全部通过 (${n})`);
```

- [ ] **Step 2: 运行，确认失败**

Run: `npx tsx scripts/test-deck-analytics.mts`
Expected: FAIL — `Cannot find module '../src/lib/bot-filter.ts'`

- [ ] **Step 3: 实现**

Create `src/lib/bot-filter.ts`:

```ts
/**
 * 简易 bot 判定：用于浏览统计过滤，宁可漏放不误杀真人。
 * 依据 User-Agent 特征;空 UA 视为非真人。server-only 使用（纯逻辑，可测）。
 */
const BOT_RE =
  /(bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|quora link|pinterest|vkshare|w3c_validator|curl|wget|python-requests|axios|node-fetch|go-http-client|headlesschrome|lighthouse|monitor|uptime|semrush|ahrefs|mj12|dotbot|petalbot|yandex|baiduspider|sogou)/i;

export function isBot(ua: string | null | undefined): boolean {
  if (!ua || !ua.trim()) return true;
  return BOT_RE.test(ua);
}
```

- [ ] **Step 4: 运行，确认通过**

Run: `npx tsx scripts/test-deck-analytics.mts`
Expected: PASS — `全部通过 (7)`

- [ ] **Step 5: 提交**

```bash
git add src/lib/bot-filter.ts scripts/test-deck-analytics.mts
git commit -m "feat(deck): bot-filter UA 判定 + 断言测试

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: 服务层 `recordDeckView` + `getDeckStats`

**Files:**

- Modify: `src/modules/deck/deck.service.ts`

**Interfaces:**

- Consumes: `deckView`（Task 1）、`getUuid`（`@/lib/hash`）
- Produces:
  - `recordDeckView(deckId: string, visitorId: string): Promise<void>` — 30 分钟节流后插入一行。
  - `getDeckStats(deckId: string, userId: string): Promise<{ views: number; uniques: number } | null>` — 仅所有者；非本人/不存在返回 null。

- [ ] **Step 1: 实现 `recordDeckView`**

在 `src/modules/deck/deck.service.ts` 顶部确保 import 了需要的算子（`and`、`eq`、`gte`、`desc`、`sql`、`count` 视用法而定，从 `drizzle-orm` 补齐；`deckView` 从 schema 引入），并加：

```ts
const VIEW_THROTTLE_MS = 30 * 60 * 1000; // 30 分钟

/** 记录一次浏览：同一访客对同一 deck 30 分钟内只记 1 次。 */
export async function recordDeckView(
  deckId: string,
  visitorId: string
): Promise<void> {
  const cutoff = new Date(Date.now() - VIEW_THROTTLE_MS);
  const [recent] = await db()
    .select({ id: deckView.id })
    .from(deckView)
    .where(
      and(
        eq(deckView.deckId, deckId),
        eq(deckView.visitorId, visitorId),
        gte(deckView.createdAt, cutoff)
      )
    )
    .limit(1);
  if (recent) return; // 命中节流，不重复记录
  const { getUuid } = await import('@/lib/hash');
  await db()
    .insert(deckView)
    .values({ id: getUuid(), deckId, visitorId, createdAt: new Date() });
}
```

- [ ] **Step 2: 实现 `getDeckStats`**

```ts
/** 所有者读某 deck 的统计：总浏览 + 独立访客。非本人/不存在返回 null。 */
export async function getDeckStats(
  deckId: string,
  userId: string
): Promise<{ views: number; uniques: number } | null> {
  const [owned] = await db()
    .select({ id: deck.id })
    .from(deck)
    .where(and(eq(deck.id, deckId), eq(deck.userId, userId)))
    .limit(1);
  if (!owned) return null;

  const [row] = await db()
    .select({
      views: sql<number>`count(*)`,
      uniques: sql<number>`count(distinct ${deckView.visitorId})`,
    })
    .from(deckView)
    .where(eq(deckView.deckId, deckId));
  return {
    views: Number(row?.views ?? 0),
    uniques: Number(row?.uniques ?? 0),
  };
}
```

> 注：`sql` 从 `drizzle-orm` 引入。`count(*)` / `count(distinct …)` 在 pg/mysql/sqlite 都通用。返回值统一 `Number(...)`（驱动可能给字符串）。

- [ ] **Step 3: 构建**

Run: `pnpm build` 且 `npx tsc --noEmit -p tsconfig.json`（0 错）
Expected: 成功。

- [ ] **Step 4: 提交**

```bash
git add src/modules/deck/deck.service.ts
git commit -m "feat(deck): recordDeckView(节流) + getDeckStats(所有者聚合)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: 信标接口 `POST /api/d/$slug/view`

**Files:**

- Create: `src/routes/api/d/$slug/view.ts`

**Interfaces:**

- Consumes: `getPublishedDeckBySlug`、`recordDeckView`、`isBot`、`getCookieFromHeader`（`@/lib/cookie`）、`getUuid`（`@/lib/hash`）、`respData`

- [ ] **Step 1: 实现路由**

Create `src/routes/api/d/$slug/view.ts`：

```ts
import { createFileRoute } from '@tanstack/react-router';

import {
  getPublishedDeckBySlug,
  recordDeckView,
} from '@/modules/deck/deck.service';
import { isBot } from '@/lib/bot-filter';
import { getCookieFromHeader } from '@/lib/cookie';
import { getUuid } from '@/lib/hash';
import { respData } from '@/lib/resp';

const YEAR_SECONDS = 365 * 24 * 60 * 60;

/** POST /api/d/{slug}/view — 记录一次浏览。公开、无需登录。 */
async function POST({
  request,
  params,
}: {
  request: Request;
  params: { slug: string };
}) {
  // bot 过滤
  if (isBot(request.headers.get('user-agent'))) return respData({ ok: true });

  const deck = await getPublishedDeckBySlug(params.slug);
  if (!deck) return respData({ ok: true });

  // 匿名访客 cookie
  let visitorId = getCookieFromHeader(
    request.headers.get('cookie'),
    'deck_visitor'
  );
  let setCookie = false;
  if (!visitorId) {
    visitorId = getUuid();
    setCookie = true;
  }

  await recordDeckView(deck.id, visitorId);

  const res = respData({ ok: true });
  if (setCookie) {
    const secure = process.env.NODE_ENV === 'production' ? ' Secure;' : '';
    res.headers.append(
      'set-cookie',
      `deck_visitor=${visitorId}; Path=/; Max-Age=${YEAR_SECONDS}; HttpOnly;${secure} SameSite=Lax`
    );
  }
  return res;
}

export const Route = createFileRoute('/api/d/$slug/view')({
  server: { handlers: { POST } },
});
```

- [ ] **Step 2: 构建**

Run: `pnpm build` 且 `npx tsc --noEmit`（0 错）
Expected: 成功，路由 `/api/d/$slug/view` 出现在路由树。

- [ ] **Step 3: 提交**

```bash
git add src/routes/api/d/\$slug/view.ts
git commit -m "feat(deck): POST /api/d/:slug/view 浏览信标(cookie+节流+bot)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: 统计接口 `GET /api/decks/$id/stats`

**Files:**

- Create: `src/routes/api/decks/$id/stats.ts`

**Interfaces:**

- Consumes: `getDeckStats`、`requireSession`、`respData`/`respErr`

- [ ] **Step 1: 实现路由**

Create `src/routes/api/decks/$id/stats.ts`：

```ts
import { createFileRoute } from '@tanstack/react-router';

import { getDeckStats } from '@/modules/deck/deck.service';
import { respData, respErr } from '@/lib/resp';
import { requireSession } from '@/lib/session';

/** GET /api/decks/{id}/stats — 所有者读浏览统计。 */
async function GET({
  request,
  params,
}: {
  request: Request;
  params: { id: string };
}) {
  const auth = await requireSession(request);
  if (auth instanceof Response) return auth;
  const stats = await getDeckStats(params.id, auth.userId);
  if (!stats) return respErr('Deck not found');
  return respData(stats);
}

export const Route = createFileRoute('/api/decks/$id/stats')({
  server: { handlers: { GET } },
});
```

- [ ] **Step 2: 构建**

Run: `pnpm build` 且 `npx tsc --noEmit`（0 错）
Expected: 成功。

- [ ] **Step 3: 提交**

```bash
git add src/routes/api/decks/\$id/stats.ts
git commit -m "feat(deck): GET /api/decks/:id/stats 所有者读浏览统计

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: 前端打信标（公开 + 密码两条路径）

**Files:**

- Modify: `src/routes/d/$slug.tsx`, `src/components/deck/deck-password-gate.tsx`

**Interfaces:**

- Consumes: `apiPost`（`@/lib/api-client`）

- [ ] **Step 1: 公开 deck 路径**

在 `src/routes/d/$slug.tsx`：非 locked（即已拿到完整内容 `PublicDeck`）时，用一次性 `useEffect` 打信标。加 import `import { apiPost } from '@/lib/api-client';`，并在 `DeckPage` 组件里（拿到 slug 与非 locked deck 后）：

```tsx
useEffect(() => {
  if ('locked' in data.deck && data.deck.locked) return; // 密码 deck 由门禁组件负责
  apiPost(`/api/d/${slug}/view`).catch(() => {});
}, [slug]);
```

> 放在组件内、`if ('locked' in data.deck)` 提前 return 之前声明（Hooks 不能放在条件后）。`data`/`slug` 用该组件已有的 `Route.useLoaderData()` / `Route.useParams()`。

- [ ] **Step 2: 密码 deck 路径**

在 `src/components/deck/deck-password-gate.tsx`：当内容查询成功且 `!data.locked`（即解锁后拿到内容）时打一次信标。加 `import { apiPost } from '@/lib/api-client';`，并加：

```tsx
useEffect(() => {
  if (contentQuery.data && !contentQuery.data.locked) {
    apiPost(`/api/d/${slug}/view`).catch(() => {});
  }
}, [contentQuery.data, slug]);
```

> `contentQuery`/`slug` 是组件已有变量。effect 依赖 `contentQuery.data`，解锁成功(locked 由 true→false)时触发一次。

- [ ] **Step 3: 构建**

Run: `pnpm build` 且 `npx tsc --noEmit`（0 错）
Expected: 成功。

- [ ] **Step 4: 提交**

```bash
git add src/routes/d/\$slug.tsx src/components/deck/deck-password-gate.tsx
git commit -m "feat(deck): 内容显示时打浏览信标(公开/密码两条路径)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: 所有者页统计卡片 + 文案

**Files:**

- Modify: `src/routes/settings/decks.$id.tsx`, `messages/en.json`, `messages/zh.json`

**Interfaces:**

- Consumes: `apiGet`（`@/lib/api-client`）、i18n `m`

- [ ] **Step 1: 加文案键**

`messages/zh.json` 加：

```json
"settings.deck_stats.title": "浏览统计",
"settings.deck_stats.views": "总浏览",
"settings.deck_stats.uniques": "独立访客",
"settings.deck_stats.note": "同一访客 30 分钟内多次打开算 1 次浏览；清除 cookie / 无痕会被当作新访客；包含你自己的预览。"
```

`messages/en.json` 加：

```json
"settings.deck_stats.title": "Views",
"settings.deck_stats.views": "Total views",
"settings.deck_stats.uniques": "Unique visitors",
"settings.deck_stats.note": "Repeated opens by the same visitor within 30 min count once; clearing cookies / incognito counts as a new visitor; includes your own previews."
```

- [ ] **Step 2: 加统计卡片**

在 `src/routes/settings/decks.$id.tsx` 的编辑器主组件里，用 `useQuery` 拉统计并渲染两张数字卡片：

```tsx
const statsQ = useQuery({
  queryKey: ['deck-stats', id],
  queryFn: () =>
    apiGet<{ views: number; uniques: number }>(`/api/decks/${id}/stats`),
});
```

在合适位置（如发布区附近）渲染：

```tsx
<div className="space-y-2">
  <div className="text-sm font-medium">{m['settings.deck_stats.title']()}</div>
  <div className="flex gap-4">
    <div className="rounded-lg border p-3">
      <div className="text-2xl font-bold">{statsQ.data?.views ?? '—'}</div>
      <div className="text-muted-foreground text-xs">
        {m['settings.deck_stats.views']()}
      </div>
    </div>
    <div className="rounded-lg border p-3">
      <div className="text-2xl font-bold">{statsQ.data?.uniques ?? '—'}</div>
      <div className="text-muted-foreground text-xs">
        {m['settings.deck_stats.uniques']()}
      </div>
    </div>
  </div>
  <p className="text-muted-foreground text-xs">
    {m['settings.deck_stats.note']()}
  </p>
</div>
```

> 确认 `useQuery`、`apiGet`、`m` 已 import；`id` 是该页已有的 deck id 变量。放在合适的容器内，样式对齐周边即可。

- [ ] **Step 3: 构建**

Run: `pnpm build` 且 `npx tsc --noEmit`（0 错），无缺失 i18n 键。
Expected: 成功。

- [ ] **Step 4: 提交**

```bash
git add src/routes/settings/decks.\$id.tsx messages/en.json messages/zh.json
git commit -m "feat(deck): 编辑器浏览统计卡片(总浏览/独立访客)+ 文案

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: 端到端验证 + 生产迁移 + 部署

**Files:** 无（验证 + 迁移 + 部署）

- [ ] **Step 1: 本地全绿**

Run: `pnpm build` 且 `npx tsc --noEmit -p tsconfig.json`（0 错）；`npx tsx scripts/test-deck-analytics.mts`（全部通过）。

- [ ] **Step 2: 生产库迁移（新增 deck_view 表）**

> 生产 Neon 库需要建 `deck_view` 表。用户在本地用生产连接串执行：

```bash
DATABASE_PROVIDER=postgresql DATABASE_URL="postgres://…neon…" pnpm db:generate   # 生成迁移 SQL，人工 review
DATABASE_PROVIDER=postgresql DATABASE_URL="postgres://…neon…" pnpm db:migrate    # 应用
```

Expected: `deck_view` 表在生产库创建;review 迁移 SQL 确认只新增表、无破坏性操作。

- [ ] **Step 3: 部署**（需用户明确授权点名生产目标）

Run: `pnpm cf:deploy`
Expected: `Deployed deckgene`。

- [ ] **Step 4: 手动验收（按 spec §6）**

1. 隐身窗打开某公开 deck → 编辑器统计总浏览 +1、独立 +1。
2. 30 分钟内刷新 → 总浏览不增。
3. 换另一个隐身窗 → 独立 +1。
4. `curl -A 'curl/8.4.0' -X POST https://deckgene.com/api/d/<slug>/view` → 不计。
5. 密码 deck：只看到密码页不计；解锁后 +1。
6. 所有者页看到两个数字 + 口径说明。

- [ ] **Step 5: 完成**

若任一步不符，回对应 Task 修复后重跑 `pnpm build` 再部署。

---

## Self-Review 记录

- **Spec 覆盖**：§2 计数机制→Task4（信标）+ Task6（前端触发）；§3 数据模型→Task1；§4 读取展示→Task3（getDeckStats）+ Task5（接口）+ Task7（UI）；§5 隐私（匿名 cookie/不存 IP/httpOnly/Secure 仅生产/仅所有者可读）→Task1/3/4/5；bot 过滤→Task2；节流→Task3；§6 测试→Task2 断言 + Task8 手动。
- **占位符**：无 TODO/TBD；每步含完整代码或确切命令。少数"确认既有 import/变量"是让实现者对齐现有代码，非占位。
- **类型一致**：`deck_view` 表名/列名、cookie 名 `deck_visitor`、`recordDeckView`/`getDeckStats`/`isBot` 签名、`{views,uniques}` 返回结构在 Task1/3/4/5/7 一致。
- **schema 三方言 + active + 生产迁移**：Task1 覆盖模板与 active，Task8 覆盖生产迁移——不遗漏。
