# Deck 密码保护 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 deck 所有者给已发布的 live 链接设置密码，访客必须输对密码才能查看内容；验证通过前服务端不下发任何幻灯片内容。

**Architecture:** 复用已有 `deck.visibility`/`deck.passwordHash` 字段。密码用 Web Crypto PBKDF2 哈希；解锁凭证是 HMAC 签名、绑定 deckId、7 天有效的 httpOnly cookie。cookie 只在能直接拿到 `request` 的 API 路由里读写。密码 deck 的内容不走 SSR loader，而是由 `GET /api/d/$slug/content` 在校验 cookie 后返回，从根本上保证"未验证不出内容"。

**Tech Stack:** TanStack Start (React 19, file routes), Drizzle ORM, Web Crypto (`crypto.subtle`), TanStack Query + `@/lib/api-client`, TanStack Form + zod, shadcn Dialog。

## Global Constraints

- 语言：所有面向用户文案走 i18n，键加进 `messages/en.json` 和 `messages/zh.json`，用 `m['ns.key']()` 读取。
- 数据获取：组件不用裸 `fetch`，用 `@/lib/api-client`（`apiGet`/`apiPost`）+ TanStack Query。
- API 路由返回 `respData`/`respErr`（`@/lib/resp`）。
- 每个任务结束跑 `pnpm build` 必须通过（本仓无单测框架，纯库用可运行断言脚本验证）。
- **秘密绝不下发前端**：`passwordHash`、明文密码、`AUTH_SECRET` 不得出现在任何客户端响应/bundle。
- `deck-password.ts` 是 **server-only** 模块，只能被 API 路由/服务端模块 import，禁止被客户端组件 import。
- 时间戳用 `Date.now()`。
- 提交信息末尾加 `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`。

---

## File Structure

**新增**

- `src/lib/deck-password.ts` — 纯函数：PBKDF2 密码哈希/校验 + HMAC 解锁 token 签名/校验（server-only）。
- `scripts/test-deck-password.mts` — 该库的可运行断言测试。
- `src/routes/api/decks/$id/share.ts` — `PATCH`：所有者设置/移除密码。
- `src/routes/api/d/$slug/content.ts` — `GET`：校验解锁 cookie 后返回密码 deck 的内容。
- `src/routes/api/d/$slug/unlock.ts` — `POST`：校验密码，下发解锁 cookie。
- `src/components/deck/deck-password-gate.tsx` — 访客侧：取内容/显示密码框/解锁后重取。

**改动**

- `src/modules/deck/deck.service.ts` — 加 `setDeckShare`；加 `shapePublicDeck` 复用逻辑。
- `src/modules/deck/server.ts` — `getPublicDeckFn` 对 password deck 返回 `{ locked, id, title }`。
- `src/routes/d/$slug.tsx` — `locked` 时渲染门禁组件。
- `src/routes/settings/decks.$id.tsx` — 分享设置按钮 + 弹窗。
- `messages/en.json`、`messages/zh.json` — 文案。

**不改**：数据库 schema（字段已存在）；`toApiDeck`（已输出 `visibility`）。

---

## Task 1: 密码/Token 纯函数库 + 断言测试

**Files:**

- Create: `src/lib/deck-password.ts`
- Test: `scripts/test-deck-password.mts`

**Interfaces:**

- Produces:
  - `hashDeckPassword(password: string): Promise<string>` — 返回 `pbkdf2$<iter>$<saltB64>$<hashB64>`
  - `verifyDeckPassword(password: string, stored: string): Promise<boolean>`
  - `signAccessToken(deckId: string, ttlSeconds?: number): Promise<string>` — 返回 `<exp>.<sigB64url>`
  - `verifyAccessToken(deckId: string, token: string | undefined): Promise<boolean>`

- [ ] **Step 1: 写断言测试（先失败）**

Create `scripts/test-deck-password.mts`:

```ts
// 运行：AUTH_SECRET=test-secret npx tsx scripts/test-deck-password.mts
// 纯库断言测试（本仓无测试框架，用可运行脚本代替）。
import assert from 'node:assert/strict';

import {
  hashDeckPassword,
  signAccessToken,
  verifyAccessToken,
  verifyDeckPassword,
} from '../src/lib/deck-password.ts';

let n = 0;
const ok = (msg: string) => console.log(`  ✓ ${msg}`) || n++;

// 密码哈希往返
const h = await hashDeckPassword('s3cret');
assert.match(h, /^pbkdf2\$\d+\$[^$]+\$[^$]+$/);
ok('hash 格式正确');
assert.equal(await verifyDeckPassword('s3cret', h), true);
ok('正确密码通过');
assert.equal(await verifyDeckPassword('wrong', h), false);
ok('错误密码拒绝');
assert.equal(await verifyDeckPassword('s3cret', 'garbage'), false);
ok('非法 stored 拒绝');
const h2 = await hashDeckPassword('s3cret');
assert.notEqual(h, h2);
ok('相同密码两次哈希不同(随机盐)');

// token 签名往返
const tok = await signAccessToken('deck_A');
assert.equal(await verifyAccessToken('deck_A', tok), true);
ok('有效 token 通过');
assert.equal(await verifyAccessToken('deck_B', tok), false);
ok('换 deckId 拒绝');
assert.equal(await verifyAccessToken('deck_A', undefined), false);
ok('空 token 拒绝');
assert.equal(await verifyAccessToken('deck_A', tok.replace(/.$/, 'x')), false);
ok('篡改签名拒绝');
const expired = await signAccessToken('deck_A', -10);
assert.equal(await verifyAccessToken('deck_A', expired), false);
ok('过期 token 拒绝');

console.log(`\n全部通过 (${n})`);
```

- [ ] **Step 2: 运行，确认失败**

Run: `AUTH_SECRET=test-secret npx tsx scripts/test-deck-password.mts`
Expected: FAIL — `Cannot find module '../src/lib/deck-password.ts'`

- [ ] **Step 3: 实现库**

Create `src/lib/deck-password.ts`:

```ts
/**
 * Deck 分享密码：PBKDF2 哈希 + HMAC 解锁 token。
 * server-only：读取 process.env.AUTH_SECRET，禁止被客户端组件 import。
 * 仅用 Web Crypto（crypto.subtle），Node 20+ 与 Cloudflare Workers 均可用。
 */
const enc = new TextEncoder();
const PBKDF2_ITERATIONS = 100_000;
const DEFAULT_TTL = 7 * 24 * 60 * 60; // 秒

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error('AUTH_SECRET is required for deck password');
  return s;
}

function b64(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
function unb64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function b64url(bytes: Uint8Array): string {
  return b64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function eqConst(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
function eqStr(a: string, b: string): boolean {
  return eqConst(enc.encode(a), enc.encode(b));
}

async function pbkdf2(
  password: string,
  salt: Uint8Array,
  iterations: number
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    key,
    256
  );
  return new Uint8Array(bits);
}

export async function hashDeckPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${b64(salt)}$${b64(hash)}`;
}

export async function verifyDeckPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations < 1) return false;
  let salt: Uint8Array, expected: Uint8Array;
  try {
    salt = unb64(parts[2]);
    expected = unb64(parts[3]);
  } catch {
    return false;
  }
  const got = await pbkdf2(password, salt, iterations);
  return eqConst(got, expected);
}

async function hmac(data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return new Uint8Array(sig);
}

export async function signAccessToken(
  deckId: string,
  ttlSeconds: number = DEFAULT_TTL
): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const sig = await hmac(`${deckId}.${exp}`);
  return `${exp}.${b64url(sig)}`;
}

export async function verifyAccessToken(
  deckId: string,
  token: string | undefined
): Promise<boolean> {
  if (!token) return false;
  const dot = token.indexOf('.');
  if (dot <= 0) return false;
  const exp = Number(token.slice(0, dot));
  const sig = token.slice(dot + 1);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000))
    return false;
  const expected = b64url(await hmac(`${deckId}.${exp}`));
  return eqStr(sig, expected);
}
```

- [ ] **Step 4: 运行，确认通过**

Run: `AUTH_SECRET=test-secret npx tsx scripts/test-deck-password.mts`
Expected: PASS — `全部通过 (10)`

- [ ] **Step 5: 提交**

```bash
git add src/lib/deck-password.ts scripts/test-deck-password.mts
git commit -m "feat(deck): 密码哈希 + 解锁 token 纯函数库

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: 服务层 `setDeckShare` + `shapePublicDeck`

**Files:**

- Modify: `src/modules/deck/deck.service.ts`

**Interfaces:**

- Consumes: `hashDeckPassword` (Task 1)
- Produces:
  - `setDeckShare(id: string, userId: string, opts: { password: string | null }): Promise<Deck | null>`
  - `shapePublicDeck(deck: DeckWithSlides): Promise<{ title: string; slides: PublicSlide[]; brand: PublicBrand | null }>`（从 `server.ts` 现有 brand 取用 + slide 塑形逻辑抽出，供 content 路由与 `getPublicDeckFn` 复用）

- [ ] **Step 1: 加 `setDeckShare`**

在 `src/modules/deck/deck.service.ts` 末尾（`publishDeck` 附近）新增：

```ts
/** 设置/移除 deck 分享密码。password 非空→password 模式；null→回 unlisted。 */
export async function setDeckShare(
  id: string,
  userId: string,
  opts: { password: string | null }
): Promise<Deck | null> {
  const { hashDeckPassword } = await import('@/lib/deck-password');
  const hasPw = typeof opts.password === 'string' && opts.password.length > 0;
  const [row] = await db()
    .update(deck)
    .set(
      hasPw
        ? {
            visibility: 'password',
            passwordHash: await hashDeckPassword(opts.password as string),
          }
        : { visibility: 'unlisted', passwordHash: null }
    )
    .where(and(eq(deck.id, id), eq(deck.userId, userId)))
    .returning();
  return row ?? null;
}
```

- [ ] **Step 2: 加 `shapePublicDeck`（DRY，供内容路由与 loader 复用）**

在同文件加一个塑形函数（把 `server.ts` 里现有的 brand 取用 + slide 映射逻辑集中到这里）：

```ts
/** 把 DeckWithSlides 塑成公开渲染负载（title + slides + brand）。 */
export async function shapePublicDeck(d: DeckWithSlides): Promise<{
  title: string;
  slides: {
    id: string;
    slide_type: string;
    order: number;
    content: Record<string, unknown>;
    notes: string | null;
  }[];
  brand: {
    palette: Record<string, string> | null;
    typography: Record<string, string> | null;
    logo_url: string | null;
  } | null;
}> {
  let brand = null as null | {
    palette: Record<string, string> | null;
    typography: Record<string, string> | null;
    logo_url: string | null;
  };
  if (d.brandId) {
    const { brand: brandTable } = await import('@/config/db/schema');
    const [b] = await db()
      .select()
      .from(brandTable)
      .where(eq(brandTable.id, d.brandId))
      .limit(1);
    if (b) {
      brand = {
        palette: b.palette as Record<string, string> | null,
        typography: b.typography as Record<string, string> | null,
        logo_url: b.logoUrl,
      };
    }
  }
  return {
    title: d.title,
    slides: d.slides.map((s) => ({
      id: s.id,
      slide_type: s.slideType,
      order: s.order,
      content: (s.content ?? {}) as Record<string, unknown>,
      notes: s.notes,
    })),
    brand,
  };
}
```

> 注：`db`、`and`、`eq`、`deck`、`DeckWithSlides` 在本文件已 import；确认 `and` 已在顶部 `import { and, eq, asc } from 'drizzle-orm'` 中（`publishDeck` 已用 `and`）。

- [ ] **Step 3: 构建验证**

Run: `pnpm build`
Expected: 构建成功，无类型错误。

- [ ] **Step 4: 提交**

```bash
git add src/modules/deck/deck.service.ts
git commit -m "feat(deck): setDeckShare + shapePublicDeck 服务函数

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: 分享设置 API `PATCH /api/decks/$id/share`

**Files:**

- Create: `src/routes/api/decks/$id/share.ts`

**Interfaces:**

- Consumes: `setDeckShare`, `toApiDeck`（deck.service）、`requireSession`、`respData`/`respErr`

- [ ] **Step 1: 实现路由**

Create `src/routes/api/decks/$id/share.ts`（参照 `unpublish.ts` 的结构）：

```ts
import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { setDeckShare, toApiDeck } from '@/modules/deck/deck.service';
import { respData, respErr } from '@/lib/resp';
import { requireSession } from '@/lib/session';

/** PATCH /api/decks/{id}/share — 设置/移除分享密码。body: { password?: string|null } */
async function PATCH({
  request,
  params,
}: {
  request: Request;
  params: { id: string };
}) {
  const auth = await requireSession(request);
  if (auth instanceof Response) return auth;

  let body: { password?: string | null };
  try {
    body = await request.json();
  } catch {
    return respErr('Invalid JSON');
  }
  const password =
    typeof body.password === 'string' && body.password.length > 0
      ? body.password
      : null;

  const d = await setDeckShare(params.id, auth.userId, { password });
  if (!d) return respErr('Deck not found');
  return respData(toApiDeck(d, envConfigs.app_url));
}

export const Route = createFileRoute('/api/decks/$id/share')({
  server: { handlers: { PATCH } },
});
```

- [ ] **Step 2: 构建验证**

Run: `pnpm build`
Expected: 成功。路由 `/api/decks/$id/share` 出现在生成的路由树。

- [ ] **Step 3: 提交**

```bash
git add src/routes/api/decks/\$id/share.ts
git commit -m "feat(deck): PATCH /api/decks/:id/share 设置分享密码

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: `getPublicDeckFn` 对 password deck 返回 locked

**Files:**

- Modify: `src/modules/deck/server.ts`

**Interfaces:**

- Consumes: `getPublishedDeckBySlug`, `shapePublicDeck`（Task 2）
- Produces: `getPublicDeckFn` 返回类型改为 `PublicDeck | LockedDeck | null`，其中 `LockedDeck = { locked: true; id: string; title: string }`

- [ ] **Step 1: 改造 `getPublicDeckFn`**

编辑 `src/modules/deck/server.ts`，在类型区加：

```ts
export interface LockedDeck {
  locked: true;
  id: string;
  title: string;
}
```

把 `getPublicDeckFn` 的 handler 改为（保留非 password 行为，password 一律返回 locked，内容改由 content 路由提供）：

```ts
export const getPublicDeckFn = createServerFn()
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }): Promise<PublicDeck | LockedDeck | null> => {
    const { getPublishedDeckBySlug, shapePublicDeck } =
      await import('./deck.service');
    const deck = await getPublishedDeckBySlug(data.slug);
    if (!deck) return null;

    // 过期的 expiring 仍视为不可见（保留原逻辑）
    if (
      deck.visibility === 'expiring' &&
      deck.expiresAt &&
      new Date(deck.expiresAt).getTime() < Date.now()
    ) {
      return null;
    }

    // 密码保护：loader 不下发内容，只回 locked 元信息；内容走 /api/d/:slug/content
    if (deck.visibility === 'password') {
      return { locked: true, id: deck.id, title: deck.title };
    }

    const shaped = await shapePublicDeck(deck);
    return {
      id: deck.id,
      title: shaped.title,
      slug: deck.slug,
      locale: deck.locale,
      brand: shaped.brand,
      slides: shaped.slides,
    };
  });
```

> 删除原 handler 里"visibility==='password' 返回 null"及原先内联的 brand 取用代码（已抽到 `shapePublicDeck`）。保留 `PublicDeck`/`PublicSlide`/`PublicBrand` 接口定义。

- [ ] **Step 2: 构建验证**

Run: `pnpm build`
Expected: 成功。

- [ ] **Step 3: 提交**

```bash
git add src/modules/deck/server.ts
git commit -m "feat(deck): password deck 的 loader 只返回 locked 元信息

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: 内容 API `GET /api/d/$slug/content`

**Files:**

- Create: `src/routes/api/d/$slug/content.ts`

**Interfaces:**

- Consumes: `getPublishedDeckBySlug`, `shapePublicDeck`, `verifyAccessToken`, `getCookieFromHeader`, `respData`
- Produces: JSON `{ locked: true }` 或 `{ locked: false, title, slides, brand }`

- [ ] **Step 1: 实现路由**

Create `src/routes/api/d/$slug/content.ts`：

```ts
import { createFileRoute } from '@tanstack/react-router';

import {
  getPublishedDeckBySlug,
  shapePublicDeck,
} from '@/modules/deck/deck.service';
import { getCookieFromHeader } from '@/lib/cookie';
import { verifyAccessToken } from '@/lib/deck-password';
import { respData } from '@/lib/resp';

/** GET /api/d/{slug}/content — 校验解锁 cookie 后返回 password deck 内容。 */
async function GET({
  request,
  params,
}: {
  request: Request;
  params: { slug: string };
}) {
  const deck = await getPublishedDeckBySlug(params.slug);
  if (!deck) return respData({ locked: true });

  // 非密码 deck：本路由不该被调用，但也直接给内容（幂等安全）
  if (deck.visibility !== 'password') {
    const shaped = await shapePublicDeck(deck);
    return respData({ locked: false, ...shaped });
  }

  const token = getCookieFromHeader(
    request.headers.get('cookie'),
    `deck_access_${deck.id}`
  );
  const okAccess = await verifyAccessToken(deck.id, token);
  if (!okAccess) return respData({ locked: true });

  const shaped = await shapePublicDeck(deck);
  return respData({ locked: false, ...shaped });
}

export const Route = createFileRoute('/api/d/$slug/content')({
  server: { handlers: { GET } },
});
```

- [ ] **Step 2: 构建验证**

Run: `pnpm build`
Expected: 成功。

- [ ] **Step 3: 提交**

```bash
git add src/routes/api/d/\$slug/content.ts
git commit -m "feat(deck): GET /api/d/:slug/content 校验 cookie 后返回内容

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: 解锁 API `POST /api/d/$slug/unlock`

**Files:**

- Create: `src/routes/api/d/$slug/unlock.ts`

**Interfaces:**

- Consumes: `getPublishedDeckBySlug`, `verifyDeckPassword`, `signAccessToken`, `enforceMinIntervalRateLimit`, `respData`/`respErr`
- Produces: 成功时 `respData({ ok: true })` + `Set-Cookie: deck_access_<id>`；失败 `respErr('密码错误')`

- [ ] **Step 1: 实现路由**

Create `src/routes/api/d/$slug/unlock.ts`：

```ts
import { createFileRoute } from '@tanstack/react-router';

import { getPublishedDeckBySlug } from '@/modules/deck/deck.service';
import { signAccessToken, verifyDeckPassword } from '@/lib/deck-password';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr } from '@/lib/resp';

const WEEK_SECONDS = 7 * 24 * 60 * 60;

/** POST /api/d/{slug}/unlock — 校验密码，成功下发解锁 cookie。公开、无需登录。 */
async function POST({
  request,
  params,
}: {
  request: Request;
  params: { slug: string };
}) {
  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: 1000,
    keyPrefix: 'deck-unlock',
    extraKey: params.slug,
  });
  if (limited) return limited;

  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return respErr('Invalid JSON');
  }
  const password = typeof body.password === 'string' ? body.password : '';

  const deck = await getPublishedDeckBySlug(params.slug);
  // 统一错误：不区分 deck 不存在 / 非密码 / 密码错
  if (!deck || deck.visibility !== 'password' || !deck.passwordHash) {
    return respErr('密码错误');
  }
  const ok = await verifyDeckPassword(password, deck.passwordHash);
  if (!ok) return respErr('密码错误');

  const token = await signAccessToken(deck.id, WEEK_SECONDS);
  const res = respData({ ok: true });
  res.headers.append(
    'set-cookie',
    `deck_access_${deck.id}=${token}; Path=/; Max-Age=${WEEK_SECONDS}; HttpOnly; Secure; SameSite=Lax`
  );
  return res;
}

export const Route = createFileRoute('/api/d/$slug/unlock')({
  server: { handlers: { POST } },
});
```

> 注：`respData` 返回的是 `Response`（`@/lib/resp`），可 `res.headers.append('set-cookie', ...)`。若确认 `respData` 返回的不是标准 `Response`，改为 `return new Response(JSON.stringify({code:0,message:'ok',data:{ok:true}}), { headers: { 'content-type':'application/json','set-cookie': ... }})`。实现前先看一眼 `src/lib/resp.ts` 确认返回类型。

- [ ] **Step 2: 确认 `respData` 返回类型**

Run: `sed -n '1,60p' src/lib/resp.ts`
若 `respData` 返回标准 `Response` → 用上面写法；否则按注释改成手工 `Response`。

- [ ] **Step 3: 构建验证**

Run: `pnpm build`
Expected: 成功。

- [ ] **Step 4: 提交**

```bash
git add src/routes/api/d/\$slug/unlock.ts
git commit -m "feat(deck): POST /api/d/:slug/unlock 校验密码下发 cookie

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: 门禁组件 `DeckPasswordGate`

**Files:**

- Create: `src/components/deck/deck-password-gate.tsx`

**Interfaces:**

- Consumes: `apiGet`/`apiPost`（`@/lib/api-client`）、`DeckRenderer`/`brandStyle`（`@/components/deck/deck-renderer`）、`DeckPlayer`、i18n `m`
- Produces: `<DeckPasswordGate slug title />`

- [ ] **Step 1: 实现组件**

Create `src/components/deck/deck-password-gate.tsx`：

```tsx
import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Play } from 'lucide-react';
import { z } from 'zod';

import { apiGet, apiPost } from '@/lib/api-client';
import { m } from '@/paraglide/messages.js';
import { DeckPlayer } from '@/components/deck/deck-player';
import { brandStyle, DeckRenderer } from '@/components/deck/deck-renderer';
import { TextField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface ContentResp {
  locked: boolean;
  title?: string;
  slides?: any[];
  brand?: any;
}

export function DeckPasswordGate({
  slug,
  title,
}: {
  slug: string;
  title: string;
}) {
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [presenting, setPresenting] = useState(false);

  const contentQuery = useQuery({
    queryKey: ['public-deck-content', slug],
    queryFn: () => apiGet<ContentResp>(`/api/d/${slug}/content`),
  });

  const unlock = useMutation({
    mutationFn: (password: string) =>
      apiPost(`/api/d/${slug}/unlock`, { password }),
    onSuccess: () => {
      setError('');
      queryClient.invalidateQueries({
        queryKey: ['public-deck-content', slug],
      });
    },
    onError: (e: Error) => setError(e.message),
  });

  const form = useForm({
    defaultValues: { password: '' },
    validators: { onSubmit: z.object({ password: z.string().min(1) }) },
    onSubmit: async ({ value }) => {
      await unlock.mutateAsync(value.password);
    },
  });

  // 有效 cookie → 直接出内容（回访免密）
  if (contentQuery.data && !contentQuery.data.locked) {
    const d = contentQuery.data;
    return (
      <>
        <DeckRenderer slides={d.slides ?? []} brand={d.brand} />
        <button
          onClick={() => setPresenting(true)}
          className="bg-primary text-primary-foreground fixed right-5 bottom-5 z-40 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold shadow-lg"
        >
          <Play className="size-4" />
          {m['settings.deck_editor.present']()}
        </button>
        {presenting && (
          <DeckPlayer
            title={d.title ?? title}
            slides={d.slides ?? []}
            style={brandStyle(d.brand)}
            onExit={() => setPresenting(false)}
          />
        )}
      </>
    );
  }

  // 未解锁 → 密码框
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">{title}</CardTitle>
            <CardDescription>{m['deck_gate.description']()}</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                form.handleSubmit();
              }}
              className="space-y-4"
            >
              {error && (
                <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
                  {m['deck_gate.wrong_password']()}
                </div>
              )}
              <form.Field name="password">
                {(field) => (
                  <TextField
                    field={field}
                    label={m['deck_gate.password_label']()}
                    type="password"
                    required
                  />
                )}
              </form.Field>
              <form.Subscribe selector={(s) => s.isSubmitting}>
                {(isSubmitting) => (
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? '...' : m['deck_gate.submit']()}
                  </Button>
                )}
              </form.Subscribe>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

> 实现前用 `sed -n '1,40p' src/components/deck/deck-renderer.tsx` 确认 `DeckRenderer`/`brandStyle` 的 props 名，与 `d/$slug.tsx` 现有用法一致（`slides`、`brand`、`style`）。

- [ ] **Step 2: 构建验证**

Run: `pnpm build`
Expected: 成功（`deck_gate.*` 文案键在 Task 9 加入前，若构建对缺失键报错则先跳到 Task 9 加键再回来；Paraglide 缺键通常构建期告警而非报错——以实际为准）。

- [ ] **Step 3: 提交**

```bash
git add src/components/deck/deck-password-gate.tsx
git commit -m "feat(deck): DeckPasswordGate 访客密码门禁组件

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: 接入 `/d/$slug.tsx`

**Files:**

- Modify: `src/routes/d/$slug.tsx`

**Interfaces:**

- Consumes: `getPublicDeckFn`（现在可能返回 `LockedDeck`）、`DeckPasswordGate`

- [ ] **Step 1: 处理 locked 分支**

编辑 `src/routes/d/$slug.tsx`。loader 保持 `getPublicDeckFn`，组件里按 `locked` 分流：

```tsx
import { DeckPasswordGate } from '@/components/deck/deck-password-gate';

// ...existing imports...

function DeckPage() {
  const { deck } = Route.useLoaderData();
  const [presenting, setPresenting] = useState(false);

  if ('locked' in deck && deck.locked) {
    return <Route.useParams>{/* 见下：用 params.slug */}</Route.useParams>;
  }
  // ...existing full render...
}
```

实际用 params 取 slug，改成：

```tsx
function DeckPage() {
  const data = Route.useLoaderData();
  const { slug } = Route.useParams();
  const [presenting, setPresenting] = useState(false);

  if ('locked' in data.deck && data.deck.locked) {
    return <DeckPasswordGate slug={slug} title={data.deck.title} />;
  }
  const deck = data.deck; // PublicDeck
  return (
    <>
      <DeckRenderer slides={deck.slides} brand={deck.brand} />
      <button
        onClick={() => setPresenting(true)}
        className="bg-primary text-primary-foreground fixed right-5 bottom-5 z-40 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold shadow-lg"
      >
        <Play className="size-4" />
        {m['settings.deck_editor.present']()}
      </button>
      {presenting && (
        <DeckPlayer
          title={deck.title}
          slides={deck.slides}
          style={brandStyle(deck.brand)}
          onExit={() => setPresenting(false)}
        />
      )}
    </>
  );
}
```

head 的 `loaderData?.deck.title`：`LockedDeck` 也有 `title`，保持不变即可。

- [ ] **Step 2: 构建验证**

Run: `pnpm build`
Expected: 成功。

- [ ] **Step 3: 提交**

```bash
git add src/routes/d/\$slug.tsx
git commit -m "feat(deck): /d/:slug 对 locked deck 渲染密码门禁

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: 分享设置弹窗（所有者 UI）+ 文案

**Files:**

- Modify: `src/routes/settings/decks.$id.tsx`
- Modify: `messages/en.json`, `messages/zh.json`

**Interfaces:**

- Consumes: `apiPatch`（`@/lib/api-client`）、`Dialog`（已 import）、i18n `m`

- [ ] **Step 1: 加文案键**

在 `messages/zh.json` 加：

```json
"settings.deck_editor.share": "分享设置",
"settings.share.title": "分享设置",
"settings.share.status_unlisted": "链接可见（任何拿到链接的人都能看）",
"settings.share.status_password": "密码保护（需输入密码）",
"settings.share.password_label": "访问密码",
"settings.share.password_placeholder": "留空并保存＝移除密码",
"settings.share.set": "保存密码",
"settings.share.remove": "移除密码",
"settings.share.saved": "已更新分享设置",
"deck_gate.description": "此内容受密码保护，请输入密码查看。",
"deck_gate.password_label": "密码",
"deck_gate.submit": "查看",
"deck_gate.wrong_password": "密码错误，请重试"
```

在 `messages/en.json` 加对应英文：

```json
"settings.deck_editor.share": "Share settings",
"settings.share.title": "Share settings",
"settings.share.status_unlisted": "Unlisted (anyone with the link can view)",
"settings.share.status_password": "Password protected",
"settings.share.password_label": "Access password",
"settings.share.password_placeholder": "Leave empty and save to remove",
"settings.share.set": "Save password",
"settings.share.remove": "Remove password",
"settings.share.saved": "Share settings updated",
"deck_gate.description": "This content is password protected. Enter the password to view.",
"deck_gate.password_label": "Password",
"deck_gate.submit": "View",
"deck_gate.wrong_password": "Wrong password, try again"
```

- [ ] **Step 2: 加分享按钮 + 弹窗**

在 `src/routes/settings/decks.$id.tsx`：

- 顶部加 `import { apiPatch } from '@/lib/api-client';`（确认 `@/lib/api-client` 导出 `apiPatch`；若无则用 `apiPost` 无妨——本 PATCH 也可改 POST，但优先 `apiPatch`）。
- 在发布按钮附近（约第 755-765 行 publish 区）加一个「分享设置」按钮：

```tsx
<Button size="sm" variant="outline" onClick={() => setShareOpen(true)}>
  {m['settings.deck_editor.share']()}
</Button>
```

- 组件内加状态：`const [shareOpen, setShareOpen] = useState(false);` 和 `const [pw, setPw] = useState('');`
- 加 mutation：

```tsx
const share = useMutation({
  mutationFn: (password: string | null) =>
    apiPatch(`/api/decks/${id}/share`, { password }),
  onSuccess: () => {
    toast.success(m['settings.share.saved']());
    queryClient.invalidateQueries({ queryKey: ['deck', id] });
    setShareOpen(false);
    setPw('');
  },
  onError: (e: Error) => toast.error(e.message),
});
```

> `queryKey` 用该页实际拉取 deck 用的 key（实现时查本文件里 `useQuery` 的 queryKey，保持一致）。

- 在组件 JSX 末尾（与已有 `addOpen` Dialog 并列）加分享弹窗：

```tsx
<Dialog open={shareOpen} onOpenChange={setShareOpen}>
  <DialogContent className="sm:max-w-[440px]">
    <DialogHeader>
      <DialogTitle>{m['settings.share.title']()}</DialogTitle>
    </DialogHeader>
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        {deck.visibility === 'password'
          ? m['settings.share.status_password']()
          : m['settings.share.status_unlisted']()}
      </p>
      <div className="space-y-2">
        <label className="text-sm font-medium">
          {m['settings.share.password_label']()}
        </label>
        <Input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder={m['settings.share.password_placeholder']()}
        />
      </div>
    </div>
    <DialogFooter className="gap-2">
      {deck.visibility === 'password' && (
        <Button
          variant="outline"
          onClick={() => share.mutate(null)}
          disabled={share.isPending}
        >
          {m['settings.share.remove']()}
        </Button>
      )}
      <Button
        onClick={() => share.mutate(pw)}
        disabled={share.isPending || !pw}
      >
        {m['settings.share.set']()}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

> 确认 `Input`、`DialogFooter`、`toast`、`useMutation`、`useQueryClient` 已在本文件 import；`deck.visibility` 来自该页已拉取的 deck 对象（`toApiDeck` 已含 `visibility`）。缺哪个补哪个 import。

- [ ] **Step 3: 构建验证**

Run: `pnpm build`
Expected: 成功，无缺失 i18n 键告警。

- [ ] **Step 4: 提交**

```bash
git add src/routes/settings/decks.\$id.tsx messages/en.json messages/zh.json
git commit -m "feat(deck): 编辑器分享设置弹窗（设置/移除密码）+ 文案

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: 端到端验证 + 部署

**Files:** 无（验证 + 部署）

- [ ] **Step 1: 本地构建全绿**

Run: `pnpm build`
Expected: 成功。

- [ ] **Step 2: 部署到生产**（需用户明确授权点名生产目标后执行）

Run: `pnpm cf:deploy`
Expected: `Deployed deckgene`。

- [ ] **Step 3: 手动验收（按 spec §6）**

1. 打开某已发布 deck 编辑器 → 分享设置 → 设密码 → 保存。
2. 隐私窗口打开 `/d/<slug>` → 出现密码页；开 DevTools Network，确认页面/接口响应**不含 slides 内容**。
3. 输错密码 → 显示"密码错误"；1 秒内连点触发限流。
4. 输对密码 → 内容显示；刷新/重开该隐私窗 → 免密直接可见（cookie 生效）。
5. 回编辑器 → 移除密码 → 隐私窗重开 `/d/<slug>` → 直接可见、无密码页。
6. 所有者在 `/settings/decks/<id>` 编辑器全程可见，不受影响。

- [ ] **Step 4: 完成**

功能上线。若任一步不符，回到对应 Task 修复后重跑 `pnpm build` 再部署。

---

## Self-Review 记录

- **Spec 覆盖**：§3.1 哈希/token→Task1；§3.2 分享 UI/API/服务→Task2/3/9；§3.3 门禁 loader/组件/解锁→Task4/5/6/7/8；§4 安全（内容后置=Task4/5、秘密不下发=Task1/3、PBKDF2=Task1、cookie 绑 deckId=Task1、限流=Task6、统一错误=Task6）；§5 边界（移除/未设密码路径=Task3/4）；§6 测试→Task1 断言 + Task10 手动。
- **实现细化 vs spec**：spec §3.3 原写"loader 读 cookie"；本计划改为"loader 只回 locked 元信息，内容由 `GET /api/d/:slug/content` 读 cookie 返回"——因为在本仓 API 路由读 cookie 是成熟模式，而 server fn 读 cookie 无先例。安全保证等价或更强（内容仅在 cookie 有效时下发）。新增文件 `content.ts` 已在计划中。
- **类型一致**：`deck_access_<id>` cookie 名、`{ locked }` 判定、`shapePublicDeck` 返回结构在 Task4/5/7 一致；`LockedDeck` 在 Task4 定义、Task8 消费。
- **占位符**：无 TODO/TBD；每步含完整代码或确切命令。少数"实现前确认 X"是让实现者核对既有签名（`resp.ts` 返回类型、`DeckRenderer` props、页面 queryKey、`apiPatch` 是否导出），非占位。
