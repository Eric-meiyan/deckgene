# 设计规格：已发布 deck 的密码保护

> 状态：已确认，待实施。日期：2026-07-08。
> 目标：让 deck 所有者给已发布的 live 链接设置一个密码；访客拿到链接后必须输入正确
> 密码才能查看内容。验证通过前，服务端绝不把幻灯片内容下发到浏览器。

---

## 1. 背景与范围

### 现状

- `/d/<slug>`（`src/routes/d/$slug.tsx`）是公开页，**无需登录**，loader 通过
  `getPublicDeckFn`（`src/modules/deck/server.ts`）把**整份幻灯片数据内嵌进页面**。
- `getPublishedDeckBySlug`（`src/modules/deck/deck.service.ts`）只按 `status='published'`
  过滤，不校验可见性。
- 发布是**一键操作**：`POST /api/decks/$id/publish` → `publishDeck` 仅设 `status='published'`，
  不设可见性，故所有已发布 deck 的 `visibility` 都停留在默认值 `unlisted`。
- 数据模型**已预留** `deck.visibility`（`unlisted | public | password | expiring`）、
  `deck.passwordHash`、`deck.expiresAt`（`src/config/db/schema.postgres.ts`）。当前
  `getPublicDeckFn` 对 `visibility==='password'` 直接返回 null（"暂不开放渲染"）。

### 本次范围

**只做密码保护**（`unlisted` ⇄ `password` 两态）。不做 public 列表、不做 expiring。
其余可见性档位以后另行迭代。

### 核心安全前提

真正的密码保护**必须在服务端完成**：当 `visibility==='password'` 且访客未持有有效解锁
凭证时，**任何响应都不得包含幻灯片内容**（否则查看源码 / 网络请求即可绕过）。这排除了
"前端弹框但内容照发"的假保护，也排除了"前端加密解密"（密文仍被下发、易错）。

---

## 2. 架构总览

```
所有者（已登录）                         访客（无需登录）
  分享设置弹窗                            GET /d/<slug>
     │ PATCH /api/decks/$id/share            │ loader 读 deck 元信息 + 解锁 cookie
     ▼                                       ▼
  setDeckShare(id,userId,{password})     visibility=password 且无有效 cookie?
     │ 设 visibility+passwordHash            │ 是 → 返回 {locked:true,title}（无内容）
     ▼                                       │ 否 → 返回完整 deck
  deck 表                                    ▼
                                         locked → <DeckPasswordGate>
                                             │ POST /api/d/<slug>/unlock {password}
                                             ▼
                                         限流 → verifyDeckPassword → 下发签名 cookie
                                             │ router.invalidate() 重载
                                             ▼
                                         loader 拿到有效 cookie → 返回完整内容
```

---

## 3. 组件与接口

### 3.1 新增：`src/lib/deck-password.ts`

纯函数库，Cloudflare Workers 与 Node 均可用（仅用 Web Crypto `crypto.subtle`）。

- `hashDeckPassword(password: string): Promise<string>`
  - PBKDF2-HMAC-SHA256，随机 16 字节盐，迭代数常量（如 100_000）。
  - 返回 `pbkdf2$<iterations>$<saltB64>$<hashB64>` 写入 `deck.passwordHash`。
- `verifyDeckPassword(password: string, stored: string): Promise<boolean>`
  - 解析 stored，用同盐同迭代数重算，**常量时间比较**。
- `signAccessToken(deckId: string, ttlSeconds?: number): Promise<string>`
  - 令 `exp = now + ttl`（默认 7 天）；`sig = HMAC-SHA256(AUTH_SECRET, `${deckId}.${exp}`)`；
    返回 `${exp}.${sigB64url}`。
- `verifyAccessToken(deckId: string, token: string): Promise<boolean>`
  - 校验签名（常量时间）+ 未过期。签名绑定 `deckId`，故 A 的 token 不能解锁 B。

> 说明：deck 分享密码是"低敏共享口令"，PBKDF2 足够；且哈希只在设置/解锁时计算，解锁已限流。
> `AUTH_SECRET` 已存在（`src/config/index.ts`）。时间戳注意：脚本/Workers 中用 `Date.now()`。

### 3.2 所有者侧：分享设置

**UI（`src/routes/settings/decks.$id.tsx`）**

- 发布按钮旁新增「分享设置」按钮（锁 / 分享图标）。
- 点击打开 `Dialog`（组件已在用）：
  - 当前状态展示：`链接可见（unlisted）` 或 `密码保护（password）`。
  - 密码输入框 + 「设置密码」「移除密码」两个操作。
  - live 链接展示 + 复制按钮。
- 用 TanStack Query mutation 调 `PATCH /api/decks/$id/share`，成功后 `invalidateQueries` + toast。

**API（新增 `src/routes/api/decks/$id/share.ts`）**

- `PATCH`，`requireSession`，仅本人（`userId` 匹配）。
- body：`{ password?: string | null }`。
  - 非空字符串 → 设密码：`visibility='password'`，`passwordHash = await hashDeckPassword(pw)`。
  - `null` / 空 → 移除：`visibility='unlisted'`，`passwordHash = null`。
- 返回 `toApiDeck`（含 `visibility`，但**绝不返回 passwordHash**）。

**服务层（`src/modules/deck/deck.service.ts`）**

- 新增 `setDeckShare(id, userId, { password }): Promise<Deck | null>`：按上面规则更新 `deck` 行。
- `toApiDeck` 增加输出 `visibility` 字段（供 UI 显示状态）；**不输出 passwordHash**。

### 3.3 访客侧：门禁流程

**loader / server fn（`src/modules/deck/server.ts` + `src/routes/d/$slug.tsx`）**

- 拆分或改造 `getPublicDeckFn`，使其能读取请求 cookie（用 `@/lib/cookie` 的
  `getCookieFromCtx` / TanStack `getWebRequest`）：
  1. 读 deck 元信息（`getPublishedDeckBySlug`）。未发布 → `notFound()`。
  2. `visibility !== 'password'` → 返回完整 deck（现状）。
  3. `visibility === 'password'`：
     - 读 cookie `deck_access_<deckId>`；`verifyAccessToken(deckId, token)` 为真 → 返回完整 deck。
     - 否则返回 `{ locked: true, title }`（**不含 slides / brand 细节**）。

**页面组件（`src/routes/d/$slug.tsx`）**

- `loaderData.locked === true` → 渲染 `<DeckPasswordGate title slug />`（新增组件）。
- 否则照常 `<DeckRenderer>` + 演示按钮。

**新增组件 `src/components/deck/deck-password-gate.tsx`**

- 一个居中的密码输入表单（TanStack Form + zod）。
- 提交 → `POST /api/d/<slug>/unlock`；成功 → `router.invalidate()` 触发 loader 重跑；
  失败 → 显示统一"密码错误"，保留输入。

**解锁接口（新增 `src/routes/api/d/$slug/unlock.ts`）**

- `POST`，**公开、无需登录**。body：`{ password: string }`。
- 限流：`enforceMinIntervalRateLimit`（`@/lib/rate-limit`），按 `slug + IP` 维度，防爆破。
- 取已发布 deck；若 `visibility !== 'password'` → 直接成功（无需密码）。
- `verifyDeckPassword(password, deck.passwordHash)`：
  - 成功 → `Set-Cookie: deck_access_<deckId>=<signAccessToken(deckId)>`（httpOnly、Secure、
    SameSite=Lax、Max-Age=7d、Path=`/`），返回 `{ ok: true }`。
  - 失败 → 返回统一错误（`respErr('密码错误')`），不区分"deck 不存在/密码错"。

---

## 4. 安全要点（逐条约束）

1. **内容后置**：`visibility==='password'` 且 cookie 无效时，服务端返回的数据结构里
   **不含任何 slide/brand 内容**，只含 `{ locked, title }`。
2. **秘密不下发**：`passwordHash`、明文密码永不出现在任何客户端响应 / 页面内嵌数据里。
   `toApiDeck` 显式排除 `passwordHash`。
3. **哈希**：PBKDF2-HMAC-SHA256 + 随机盐；验证用常量时间比较。
4. **cookie**：HMAC 签名、绑定 `deckId`、带过期；httpOnly + Secure + SameSite=Lax。
   A 的 cookie 不能解锁 B；过期后重新验证。
5. **限流**：解锁接口按 slug+IP 限流，减缓暴力尝试。
6. **错误统一**：失败信息不区分 deck 存在性 / 密码正误，避免枚举。
7. **已知限制**：deck 内图片 `/assets/<key>`（`src/routes/assets/$.ts`）仍是公开直链
   （key 随机不可猜）。本功能保护的是 **deck 页面与内容 JSON**，不是单张图片直链。
   若需图片本身鉴权，属另一更大议题，不在本次范围。
8. **取消发布仍有效**：`unpublishDeck` 后链接立即 404，与密码无关，行为不变。

---

## 5. 边界与状态

- 已发布且设了密码的 deck，**在所有者自己的编辑器/管理页**照常可见（那些走 `requireSession`
  - userId，不经过 `/d` 门禁）。
- 移除密码：`visibility` 回 `unlisted`，旧解锁 cookie 自然失效无所谓（不再校验）。
- 改密码：`passwordHash` 变更后，**旧 cookie 仍有效直到过期**（cookie 只绑 deckId 不绑密码版本）。
  可接受；若要"改密码即踢下线"，需在 token 里掺入密码版本号 —— 本次不做（YAGNI），在文档记明。
- deck 未设密码（unlisted）→ 行为完全不变，`/d/<slug>` 直接可看。

---

## 6. 测试计划

**单元**

- `hashDeckPassword` / `verifyDeckPassword`：正确密码通过、错误密码拒绝、格式往返。
- `signAccessToken` / `verifyAccessToken`：有效、换 deckId、过期、篡改签名 四种。

**手动 / 集成**

1. 设密码 → 新隐私窗口打开 `/d/<slug>` → 出现密码页、无内容（查看网络响应确认无 slides）。
2. 输错密码 → 统一报错；连续尝试触发限流。
3. 输对 → 内容显示；刷新 / 重开仍免密（cookie 生效）。
4. 移除密码 → 门禁消失，直接可看。
5. 所有者在编辑器里始终可见，不受影响。

---

## 7. 涉及文件清单

**新增**

- `src/lib/deck-password.ts` —— 哈希 + token 签名
- `src/routes/api/decks/$id/share.ts` —— 设置/移除密码
- `src/routes/api/d/$slug/unlock.ts` —— 校验密码 + 下发 cookie
- `src/components/deck/deck-password-gate.tsx` —— 密码输入页

**改动**

- `src/modules/deck/deck.service.ts` —— `setDeckShare`、`toApiDeck` 输出 `visibility`
- `src/modules/deck/server.ts` —— `getPublicDeckFn` 读 cookie + locked 分支
- `src/routes/d/$slug.tsx` —— locked 时渲染门禁组件
- `src/routes/settings/decks.$id.tsx` —— 分享设置弹窗 + 入口按钮
- `messages/en.json`、`messages/zh.json` —— 相关文案

**无需改动**：数据库 schema（字段已存在）。
