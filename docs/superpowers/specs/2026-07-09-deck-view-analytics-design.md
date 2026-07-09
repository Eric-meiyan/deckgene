# 设计规格：Deck 浏览统计（总浏览 + 独立访客）

> 状态：已确认，待实施。日期：2026-07-09。
> 目标：让 deck 所有者看到自己发布的 deck 被打开了多少次（总浏览）以及有多少不同的人打开
> （独立访客）。"打开"= 访客真正看到了内容（公开 deck 加载即算；密码 deck 需解锁后才算）。

---

## 1. 背景与范围

### 现状

- 已发布 deck 通过 `/d/<slug>`（`src/routes/d/$slug.tsx`）公开访问，无需登录。
- 密码 deck 的内容经 `GET /api/d/$slug/content`（`src/routes/api/d/$slug/content.ts`）在校验解锁
  cookie 后才下发；公开 deck 由 `/d/$slug` loader（`getPublicDeckFn`，`src/modules/deck/server.ts`）
  直接下发。
- 目前没有任何浏览计数。

### 本次范围

- **只做两个指标**：总浏览数、独立访客数。不做时间趋势、地域、来源（referrer）。
- 计数在**访客真正看到内容时**发生。
- 结果只给 **deck 所有者**看。

### 明确不做（YAGNI）

- 不存 IP、不存明文 User-Agent。
- 不做趋势 / 地域 / referrer / 实时看板。
- 不排除所有者本人的预览浏览（计入，口径已在文档记明）。

---

## 2. 计数机制

### 触发：客户端信标

- 新增 `POST /api/d/<slug>/view`。在 deck **内容真正显示的那一刻**由前端调用一次：
  - 公开 deck：`/d/$slug` 渲染完整内容时。
  - 密码 deck：解锁后 `DeckPasswordGate` 拿到内容渲染时。
- 用信标（request-based API 路由）而非 loader：本仓 server function 读写 cookie 不可靠（密码功能
  已验证），API 路由能稳定读写 cookie。代价：客户端信标理论上可被广告拦截 / bot 绕过——对"给
  所有者看的私有统计"可接受，且服务端过滤明显 bot。

### `POST /api/d/$slug/view` 逻辑（公开、无需登录）

1. **bot 过滤**：`User-Agent` 为空或匹配已知爬虫特征 → 直接 `respData({ ok: true })`，不记录。
2. **匿名访客 cookie**：读 `deck_visitor`；缺失则生成一个随机 id（`getUuid()`，不含任何个人信息），
   在响应里 `Set-Cookie: deck_visitor=<id>; Path=/; Max-Age=1年; HttpOnly; Secure(仅生产); SameSite=Lax`。
3. **节流**：查该 `(deckId, visitorId)` 最近一条 `deck_view.created_at`；若在 **30 分钟**内 → 不重复记录
   （防刷新灌水），返回 `respData({ ok: true })`。
4. 否则插入一行 `deck_view(deckId, visitorId, createdAt=now)`，返回 `respData({ ok: true })`。

> deck 需已发布才计数：先 `getPublishedDeckBySlug(slug)`，取不到直接返回 ok 不记录。

---

## 3. 数据模型

新增自定义表 `deck_view`（三方言模板同步：`schema.postgres.ts` / `schema.mysql.ts` / `schema.sqlite.ts`，
放"Custom tables"区）：

| 列           | 类型                                 | 说明                               |
| ------------ | ------------------------------------ | ---------------------------------- |
| `id`         | text PK                              | `getUuid()`                        |
| `deck_id`    | text FK → deck.id (onDelete cascade) | 所属 deck                          |
| `visitor_id` | text notNull                         | 来自匿名 cookie                    |
| `created_at` | timestamp notNull default now        | 浏览时间（也用于 30 分钟节流查询） |

索引：`(deck_id, created_at)` 便于聚合 + 节流查询；`(deck_id, visitor_id)` 便于节流命中。

- **总浏览** = `count(*) where deck_id=?`
- **独立访客** = `count(distinct visitor_id) where deck_id=?`

> 不存 IP / UA。删 deck 时 `deck_view` 随 FK cascade 清理。

---

## 4. 读取与展示

### 所有者接口

- 新增 `GET /api/decks/$id/stats`（`requireSession`，仅本人，经 deck.userId 校验）。
- 返回 `{ views: number, uniques: number }`，由新服务函数 `getDeckStats(deckId, userId)` 聚合。
- 非本人 / deck 不存在 → `respErr('Deck not found')`（不泄露）。

### UI

- **编辑器**（`src/routes/settings/decks.$id.tsx`）：两个数字卡片「总浏览」「独立访客」，`useQuery` 拉
  `/api/decks/$id/stats`。
- **deck 列表**（`src/routes/settings/decks.index.tsx`，可选）：卡片上显示总浏览数。
- i18n key 加进 `messages/{en,zh}.json`。

---

## 5. 安全 / 隐私 / 准确性

1. **匿名 cookie，不存 IP / 明文 UA** —— 合规最干净。
2. `deck_visitor` cookie 为 httpOnly（前端不需读），Secure 仅生产（对齐 `deck_access` cookie 的做法）。
3. `stats` 接口仅所有者可读；`deck_view` 表不经任何公开接口返回明细。
4. **口径说明（写入所有者可见的说明/文档）**：
   - 30 分钟节流 → 同一访客短时间刷新只算 1 次浏览。
   - 清 cookie / 无痕 → 会被当新访客，独立数偏高。
   - 所有者本人预览也计入。
   - bot 过滤基于 UA 特征，非 100%。

---

## 6. 测试计划

**单元**（可运行断言脚本，同 `test-deck-password.mts` 风格）

- bot UA 判定：已知爬虫 UA / 空 UA → true（跳过）；正常浏览器 UA → false。
- 访客 id 生成 / cookie 解析。
- 节流判定：给定"最近浏览时间"，30 分钟内 → 跳过；超过 → 记录。

**手动 / 集成**

1. 公开 deck 打开 → `/api/d/:slug/view` 被调；编辑器 stats 总浏览 +1、独立 +1。
2. 30 分钟内刷新 → 总浏览不增。
3. 换无痕窗口打开 → 独立 +1。
4. 用 bot UA（curl 自定义 UA）打 view 接口 → 不计。
5. 密码 deck 解锁后 → 计数;未解锁只看到密码页 → 不计（信标在内容渲染时才发）。
6. 所有者在 `/settings/decks/<id>` 看到两个数字。

---

## 7. 涉及文件清单

**新增**

- `src/routes/api/d/$slug/view.ts` —— 记录浏览（cookie + 节流 + bot 过滤）
- `src/routes/api/decks/$id/stats.ts` —— 所有者读统计
- `src/lib/bot-filter.ts` —— UA bot 判定（纯函数，可测）
- `scripts/test-deck-analytics.mts` —— bot 判定 / 节流判定断言测试

**改动**

- `src/config/db/schema.{postgres,mysql,sqlite}.ts` —— 新增 `deck_view` 表
- `src/modules/deck/deck.service.ts` —— `recordDeckView`、`getDeckStats`
- `src/components/deck/deck-password-gate.tsx` —— 内容显示后发信标
- `src/routes/d/$slug.tsx` —— 公开 deck 内容显示后发信标
- `src/routes/settings/decks.$id.tsx` —— 统计卡片
- `src/routes/settings/decks.index.tsx` —— 列表卡显示总浏览（可选）
- `messages/{en,zh}.json` —— 文案

> 数据库 schema **需改**（新增表），实施时用 `pnpm db:push`（开发）/ `db:generate`+`db:migrate`（生产）。
