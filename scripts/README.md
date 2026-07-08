# scripts/

运维与一次性维护脚本。**均不含硬编码密钥**:连库的脚本从环境变量 `DATABASE_URL`
(+ `DATABASE_PROVIDER`)读取连接;转存 R2 的脚本依赖本机已登录的 `wrangler`。

> 通用运行前提
>
> - Node 20+;TypeScript 脚本用 `pnpm exec tsx <file>` 运行(`with-env.ts` 会加载 `.env`)。
> - 连生产库时显式传:`DATABASE_PROVIDER=postgresql DATABASE_URL="postgres://…neon…" …`
> - 涉及 R2 的脚本需 `npx wrangler whoami` 已登录到对应 Cloudflare 账号;压缩用 macOS 自带 `sips`。

## 构建 / 环境

| 脚本           | 用途                                         | 入口                             |
| -------------- | -------------------------------------------- | -------------------------------- |
| `with-env.ts`  | 按 `NODE_ENV` 加载 `.env.*` 后再执行后续命令 | 被 `db:*` 等命令包裹调用         |
| `db-setup.mjs` | 按 `DATABASE_PROVIDER` 复制对应 schema 模板  | `pnpm db:setup`(也在 `prebuild`) |

## RBAC / 用户 / 积分

| 脚本               | 用途                                        | 用法                                                                |
| ------------------ | ------------------------------------------- | ------------------------------------------------------------------- |
| `init-rbac.ts`     | 初始化角色 / 权限(可选建管理员)             | `pnpm rbac:init --admin-email=… --admin-password=…`                 |
| `assign-role.ts`   | 给用户分配角色                              | `pnpm rbac:assign`                                                  |
| `grant-credits.ts` | 给指定邮箱用户发放积分                      | `DATABASE_URL=… pnpm exec tsx scripts/grant-credits.ts <email> <n>` |
| `make-key.ts`      | 为用户生成 `hd_live_` API key(测试 /api/v1) | `pnpm exec tsx scripts/with-env.ts tsx scripts/make-key.ts <email>` |
| `delete-user.ts`   | 删除指定邮箱用户及关联数据(测试清理)        | `DATABASE_URL=… pnpm exec tsx scripts/delete-user.ts <email>`       |

## 诊断

| 脚本          | 用途                             | 用法                                               |
| ------------- | -------------------------------- | -------------------------------------------------- |
| `db-stats.ts` | 统计数据库概况(用户/deck/品牌数) | `DATABASE_URL=… pnpm exec tsx scripts/db-stats.ts` |

## Deck 图片转存(修复图片外链在中国无法访问)

把 deck 里的外链图(如 `raw.githubusercontent.com`,国内被墙)下载 → 压缩 → 转存到自有
R2 → 把 `imageUrl` 改成同域地址 `https://deckgene.com/assets/<key>`。三者都**默认干跑**,
加 `--apply` 才真正上传 + 写库;逐图失败降级(保留原链接);只收 png/jpeg/webp/gif。

| 脚本                      | 范围                                            | 用法                                                                                      |
| ------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `rehost-deck-images.mjs`  | **整个 deck 的所有图**(推荐,存量迁移用它)       | `DATABASE_URL=… node scripts/rehost-deck-images.mjs <deckId> [--apply]`                   |
| `rehost-slide-images.mjs` | 指定页的指定几张图                              | `DATABASE_URL=… node scripts/rehost-slide-images.mjs <deckId> <page> <idx,idx> [--apply]` |
| `embed-slide-images.mjs`  | 指定页图片转 **base64 内嵌**(备用方案,一般不用) | `DATABASE_URL=… node scripts/embed-slide-images.mjs <deckId> <page> <idx,idx> [--apply]`  |

> 说明:这套是配合根因方案(生成/保存时自动转存 R2,见 `docs/image-hosting-plan.md`)的
> 手动/存量迁移工具;`rehost-deck-images.mjs` 可作为"批量迁移已有 deck"的基础。

## 测试

| 脚本                     | 用途                                                        | 用法                                                             |
| ------------------------ | ----------------------------------------------------------- | ---------------------------------------------------------------- |
| `test-deck-password.mts` | `src/lib/deck-password.ts` 的可运行断言测试(本仓无测试框架) | `AUTH_SECRET=test-secret npx tsx scripts/test-deck-password.mts` |
