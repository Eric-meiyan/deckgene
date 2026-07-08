# deckgene

**AI 幻灯片生成器** —— 把一段简介、一篇文本或一个网址,变成一套可在浏览器里演示、分享和导出的演示文稿(deck)。

deckgene reads your brief, plans the slides, fills each one from a typed template, applies your brand, and gives you a live shareable link — with password protection, fullscreen presenting, and PPTX / PDF export.

---

## 核心功能 Features

- **AI 生成** —— 输入简介 / 正文 / URL,LLM 先规划页型再按 schema 逐页填充(约 3–20 页)。可插拔的模型后端(DeepSeek / OpenAI / Claude)。
- **页型模板** —— 封面、整幅图、图文并排、图片网格、产品展示、客户证言、Logo 墙、表格、联系卡等,每种都有强类型 schema。
- **编辑器** —— 逐页编辑、增删/重排、单页 AI 改写;套用**品牌**(配色 / 字体 / Logo)。
- **发布与演示** —— 一键发布得到公开链接 `/d/<slug>`;支持全屏**演示模式**;可随时取消发布使链接失效。
- **密码保护** —— 给发布的 deck 设访问密码,访客输对才能查看;验证通过前服务端不下发任何内容(PBKDF2 哈希 + 签名 cookie + 限流)。
- **导出 / 导入** —— 导出 **PPTX**、**PDF**(经 Cloudflare Browser Rendering)、以及无损可移植的 `.deckgene.json`;导入后一键复制成新 deck。
- **图片托管** —— 配图上传到自有对象存储(R2),经同域路由 `/assets/<key>` 公开提供,带长效缓存。
- **积分** —— 生成/改写消耗积分,注册赠送新手积分。
- **账号 / 权限** —— 邮箱密码 + OAuth 登录(better-auth),RBAC 与管理后台。
- **多语言** —— 中 / 英(Paraglide JS,编译期消息 + locale 感知路由)。
- **MCP 端点** —— 内置 `/api/mcp`,可被支持 MCP 的客户端调用(如生图)。

## 工作原理 How it works

```
简介 / 文本 / URL
   └─ 规划(plan)   LLM 选出每页的 slide_type
        └─ 填充(fill)   LLM 按该页型的 zod schema 填内容(并发)
             └─ 落库为 deck + slides
                  ├─ 编辑器修订 / 套品牌
                  ├─ 发布 → /d/<slug>(可选密码保护)
                  └─ 导出 PPTX / PDF / .deckgene.json
```

## 技术栈 Tech Stack

- **框架**:TanStack Start(Vite + nitro,React 19,TypeScript strict),文件路由
- **UI**:shadcn/ui v4 + Tailwind CSS 4
- **数据**:TanStack Query / Form / Table,统一 `@/lib/api-client`
- **鉴权**:better-auth
- **数据库**:Drizzle ORM —— PostgreSQL(Neon)/ MySQL / SQLite / Turso / Cloudflare D1
- **i18n**:Paraglide JS
- **部署**:Cloudflare Workers(Postgres 经 Hyperdrive,或 D1;对象存储 R2;PDF 用 Browser Rendering)

## 项目结构 Project Structure

```
src/
├── core/            # 基础设施:db / auth / payment / storage / ai / email / i18n
├── modules/
│   └── deck/        # deck 领域逻辑:生成、编辑、品牌、导出(pptx/pdf)、可移植包
├── config/          # 环境变量、DB schema、locale
├── routes/
│   ├── d/$slug.tsx          # 公开 live deck 渲染页（含密码门禁）
│   ├── settings/decks.*     # deck 列表 / 编辑器
│   └── api/                 # 服务端接口(deck 生成/发布/分享/解锁/导出/assets…)
├── components/deck/ # DeckRenderer / DeckPlayer / 各页型 / 密码门禁
└── lib/             # 工具(api-client、deck-password、rate-limit…)
```

## 快速开始 Quick Start

```bash
pnpm install
cp .env.example .env.development   # 填入下方必填项
pnpm db:push                       # 建表
pnpm dev                           # http://localhost:3000
```

必填环境变量:

```env
VITE_APP_URL=http://localhost:3000
VITE_APP_NAME=deckgene
DATABASE_PROVIDER=sqlite            # 本地;生产用 postgresql
DATABASE_URL=file:data/local.db
AUTH_SECRET=generate-with-openssl-rand-base64-32
```

> 各类服务商凭证(LLM、存储 R2、邮件、OAuth 等)在**管理后台 `/admin/settings`** 里配置并加密存库,不必写进 `.env`。

## 常用命令 Commands

| 命令                              | 说明                            |
| --------------------------------- | ------------------------------- |
| `pnpm dev`                        | 开发服务器(端口 3000)           |
| `pnpm build`                      | 生产构建                        |
| `pnpm start`                      | 运行生产服务                    |
| `pnpm db:push`                    | 同步 schema 到数据库(开发)      |
| `pnpm db:generate` / `db:migrate` | 生成 / 执行迁移(生产)           |
| `pnpm db:studio`                  | Drizzle Studio                  |
| `pnpm cf:deploy`                  | 构建并部署到 Cloudflare Workers |

## 部署 Deploy

生产运行在 Cloudflare Workers:PostgreSQL(Neon)经 Hyperdrive 接入,配图存 R2 并经 `/assets/*` 提供,PDF 导出用 Browser Rendering。`wrangler.jsonc` 里配置绑定(`HYPERDRIVE`、`R2`、`BROWSER`),`npx wrangler secret put AUTH_SECRET` 写入密钥,`pnpm cf:deploy` 一键部署。详见 `docs/DEPLOY.md`。

## 许可证 License

本项目基于 ShipAny SaaS 脚手架构建,当前为专有软件,详见 [LICENSE](./LICENSE)。
