import { createFileRoute } from '@tanstack/react-router';

import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { getLocale } from '@/paraglide/runtime.js';
import { LocaleSelector } from '@/components/locale-selector';

const BASE = `${envConfigs.app_url}/api/v1`;
const MCP = `${envConfigs.app_url}/api/mcp`;

const t = (zh: string, en: string) => (getLocale() === 'zh' ? zh : en);

function Code({ children }: { children: string }) {
  return (
    <pre className="bg-muted text-foreground/90 overflow-auto rounded-lg p-3 text-xs leading-relaxed">
      <code>{children}</code>
    </pre>
  );
}

function Method({ m, path }: { m: string; path: string }) {
  const color =
    m === 'GET'
      ? 'bg-emerald-500/15 text-emerald-600'
      : m === 'DELETE'
        ? 'bg-red-500/15 text-red-600'
        : m === 'PATCH'
          ? 'bg-amber-500/15 text-amber-600'
          : 'bg-blue-500/15 text-blue-600';
  return (
    <div className="flex items-center gap-2 text-sm">
      <span
        className={`rounded px-1.5 py-0.5 font-mono text-xs font-bold ${color}`}
      >
        {m}
      </span>
      <code className="font-mono">{path}</code>
    </div>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 space-y-3">
      <h2 className="border-b pb-1 text-xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

function DocsPage() {
  const toc: [string, string][] = [
    ['intro', t('简介', 'Introduction')],
    ['auth', t('鉴权', 'Authentication')],
    ['errors', t('错误与积分', 'Errors & credits')],
    ['generate', t('生成 deck', 'Generate a deck')],
    ['jobs', t('任务', 'Jobs')],
    ['templates', t('页型模板', 'Slide templates')],
    ['decks', t('Decks', 'Decks')],
    ['brands', t('品牌', 'Brands')],
    ['mcp', t('MCP 接入', 'MCP integration')],
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            ← {envConfigs.app_name}
          </Link>
          <h1 className="mt-2 text-3xl font-bold">
            {t('API 与 MCP 文档', 'API & MCP Documentation')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t(
              '用接口或 MCP 程序化生成符合品牌的演示稿。',
              'Generate on-brand presentation decks programmatically. REST API and MCP server.'
            )}
          </p>
        </div>
        <LocaleSelector variant="pill" className="shrink-0" />
      </div>

      <div className="flex gap-10">
        {/* TOC */}
        <nav className="sticky top-8 hidden h-fit w-44 shrink-0 lg:block">
          <ul className="space-y-1.5 text-sm">
            {toc.map(([id, label]) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 flex-1 space-y-10">
          <Section id="intro" title={t('简介', 'Introduction')}>
            <p className="text-sm leading-relaxed">
              {t(
                `${envConfigs.app_name} 接口把文本变成结构化、符合品牌的幻灯片：你提交一段提示或素材，我们规划叙事、按固定结构填充每页、套用你的品牌，返回可发布/嵌入/导出的 deck。`,
                `The ${envConfigs.app_name} API turns text into a structured, on-brand slide deck. You send a prompt or source text; we plan a narrative, fill each slide against a typed schema, apply your brand, and return a deck you can publish, embed, or export.`
              )}
            </p>
            <p className="text-sm">
              <span className="font-semibold">{t('基础 URL', 'Base URL')}</span>{' '}
              <code className="bg-muted rounded px-1.5 py-0.5 text-xs">
                {BASE}
              </code>
            </p>
            <p className="text-muted-foreground text-sm">
              {t(
                '所有请求和响应均为 JSON。所有端点都需要 API Key（见鉴权）。',
                'All requests and responses are JSON. All endpoints require an API key (see Authentication).'
              )}
            </p>
          </Section>

          <Section id="auth" title={t('鉴权', 'Authentication')}>
            <p className="text-sm">
              {t(
                '以 Bearer Token 传入 API Key。在 ',
                'Pass your API key as a Bearer token. Create keys in '
              )}
              <Link href="/settings/apikeys" className="text-primary underline">
                {t('设置 → API Keys', 'Settings → API Keys')}
              </Link>
              {t(
                ' 创建。Key 仅在创建时显示一次，以 ',
                '. Keys are shown once at creation and start with '
              )}
              <code className="bg-muted rounded px-1 text-xs">hd_live_</code>
              {t(' 开头。', '.')}
            </p>
            <Code>{`Authorization: Bearer hd_live_xxxxxxxxxxxxxxxx`}</Code>
          </Section>

          <Section id="errors" title={t('错误与积分', 'Errors & credits')}>
            <p className="text-sm">
              {t(
                '错误使用标准 HTTP 状态码 + JSON 响应体：',
                'Errors use standard HTTP status codes and a JSON body:'
              )}
            </p>
            <Code>{`{ "error": { "code": "invalid_input", "message": "..." } }`}</Code>
            <p className="text-sm font-semibold">
              {t('错误码', 'Error codes')}
            </p>
            <ul className="text-muted-foreground list-inside list-disc text-sm">
              <li>
                <code>invalid_key</code> (401) —{' '}
                {t('Key 缺失/无效/已吊销', 'missing/invalid/revoked key')}
              </li>
              <li>
                <code>insufficient_credits</code> (402) —{' '}
                {t('积分不足', 'not enough credits')}
              </li>
              <li>
                <code>invalid_input</code> (400) —{' '}
                {t('请求体有误', 'bad request body')}
              </li>
              <li>
                <code>not_found</code> (404) —{' '}
                {t('资源不存在', 'resource does not exist')}
              </li>
              <li>
                <code>rate_limit</code> (429) —{' '}
                {t('请求过于频繁', 'too many requests')}
              </li>
            </ul>
            <p className="text-muted-foreground text-sm">
              {t(
                '生成一个 deck 消耗 100 积分；生成失败自动退还。读取（列表/详情）免费。',
                'Generating a deck costs 100 credits. Charges are refunded automatically if generation fails. Reads (list/get) are free.'
              )}
            </p>
          </Section>

          <Section id="generate" title={t('生成 deck', 'Generate a deck')}>
            <Method m="POST" path="/generate" />
            <p className="text-sm">
              {t(
                '同步：管线在请求内跑完并返回成品 deck。请求体参数：',
                'Synchronous: the pipeline runs within the request and returns the finished deck. Body parameters:'
              )}
            </p>
            <ul className="text-muted-foreground list-inside list-disc text-sm">
              <li>
                <code>input</code>{' '}
                {t(
                  '（string，必填）— 提示或素材文本，≤8000 字符',
                  '(string, required) — prompt or source text, up to 8000 chars'
                )}
              </li>
              <li>
                <code>title</code>{' '}
                {t(
                  '（string，可选）— 覆盖标题',
                  '(string, optional) — deck title override'
                )}
              </li>
              <li>
                <code>brand_id</code>{' '}
                {t(
                  '（string，可选）— 套用的品牌，默认你的激活品牌',
                  '(string, optional) — brand to apply; defaults to your active brand'
                )}
              </li>
              <li>
                <code>byok</code>{' '}
                {t('（object，可选）— ', '(object, optional) — ')}
                <code>{`{ "provider": "openai", "api_key": "sk-..." }`}</code>
                {t(' 用你自己的模型 Key', ' to use your own model key')}
              </li>
            </ul>
            <Code>{`curl -X POST ${BASE}/generate \\
  -H "Authorization: Bearer hd_live_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "input": "A 6-slide pitch for our AI note-taking app, aimed at investors",
    "title": "Acme Pitch"
  }'`}</Code>
            <p className="text-sm font-semibold">{t('响应', 'Response')}</p>
            <Code>{`{
  "job_id": "job_...",
  "status": "succeeded",
  "result": { "deck_id": "deck_...", "slug": "acme-pitch", "slides": 6 },
  "poll": "/api/v1/jobs/job_..."
}`}</Code>
            <p className="text-muted-foreground text-sm">
              {t(
                '失败时响应为 "status": "failed" 且带 error 对象（积分已退还）。',
                'On failure the response has "status": "failed" and an error object (credits are refunded).'
              )}
            </p>
          </Section>

          <Section id="jobs" title={t('任务', 'Jobs')}>
            <Method m="GET" path="/jobs/{id}" />
            <p className="text-sm">
              {t(
                '按 id 查询生成任务。生成是同步的，但任务记录会保留，便于审计与未来的异步批处理。',
                'Fetch a generation job by id. Generation is synchronous, but the job record is retained for auditing and future async batches.'
              )}
            </p>
            <Code>{`curl ${BASE}/jobs/job_xxx -H "Authorization: Bearer hd_live_xxx"`}</Code>
          </Section>

          <Section id="templates" title={t('页型模板', 'Slide templates')}>
            <Method m="GET" path="/slide-templates" />
            <p className="text-sm">
              {t(
                '列出内置页型（key、分类、使用场景）。加 ?keys=title,bullets 获取指定页型的完整 JSON Schema。',
                'List the built-in slide types (keys, categories, when to use). Add ?keys=title,bullets to get the full JSON Schema for specific types.'
              )}
            </p>
            <Code>{`curl ${BASE}/slide-templates -H "Authorization: Bearer hd_live_xxx"
curl "${BASE}/slide-templates?keys=title,stats" -H "Authorization: Bearer hd_live_xxx"`}</Code>
          </Section>

          <Section id="decks" title="Decks">
            <div className="space-y-2">
              <Method m="GET" path="/decks" />
              <Method m="GET" path="/decks/{id}" />
              <Method m="DELETE" path="/decks/{id}" />
              <Method m="POST" path="/decks/{id}/publish" />
              <Method m="POST" path="/decks/{id}/unpublish" />
            </div>
            <p className="text-sm">
              {t(
                '列出/获取 deck、删除、切换发布。发布后获得公开 url（',
                'List or fetch decks, delete, and toggle publish. A published deck gets a public url ('
              )}
              {envConfigs.app_url}/d/&#123;slug&#125;).
            </p>
            <Code>{`curl ${BASE}/decks/deck_xxx -H "Authorization: Bearer hd_live_xxx"`}</Code>
            <p className="text-sm font-semibold">
              {t('Deck 对象', 'Deck object')}
            </p>
            <Code>{`{
  "id": "deck_...",
  "title": "Acme Pitch",
  "slug": "acme-pitch",
  "status": "published",
  "visibility": "unlisted",
  "brand_id": "brand_...",
  "url": "${envConfigs.app_url}/d/acme-pitch",
  "slides": [ { "id": "...", "slide_type": "title", "order": 0, "content": { ... } } ]
}`}</Code>
          </Section>

          <Section id="brands" title={t('品牌', 'Brands')}>
            <div className="space-y-2">
              <Method m="GET" path="/brands" />
              <Method m="POST" path="/brands" />
              <Method m="GET" path="/brands/{id}" />
              <Method m="PATCH" path="/brands/{id}" />
              <Method m="DELETE" path="/brands/{id}" />
              <Method m="POST" path="/brands/set-active" />
            </div>
            <p className="text-sm">
              {t(
                '品牌承载生成时套用的配色、字体、语气与 logo。创建并设为激活，生成时默认套用。',
                'A brand carries the palette, typography, tone, and logo applied to generated decks. Create one and set it active so generation uses it by default.'
              )}
            </p>
            <Code>{`curl -X POST ${BASE}/brands \\
  -H "Authorization: Bearer hd_live_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Acme",
    "palette": { "primary": "#2563eb", "background": "#ffffff", "text": "#111111" },
    "typography": { "heading_font": "Inter" },
    "tone": "confident, concise"
  }'

curl -X POST ${BASE}/brands/set-active \\
  -H "Authorization: Bearer hd_live_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{ "brand_id": "brand_xxx" }'`}</Code>
          </Section>

          <Section id="mcp" title={t('MCP 接入', 'MCP integration')}>
            <p className="text-sm">
              {t(
                `${envConfigs.app_name} 提供 Model Context Protocol 服务，AI 客户端（Claude 等）可把"建 deck"当作工具调用。端点：`,
                `${envConfigs.app_name} ships a Model Context Protocol server, so AI clients (Claude, etc.) can create decks as a tool. Endpoint:`
              )}
            </p>
            <Code>{MCP}</Code>
            <p className="text-sm">
              {t(
                '在 Claude Code 中连接（用 API Key 作为 bearer token）：',
                'Connect from Claude Code (use an API key as the bearer token):'
              )}
            </p>
            <Code>{`claude mcp add ${envConfigs.app_name} \\
  --transport http ${MCP} \\
  --header "Authorization: Bearer hd_live_xxx"`}</Code>
            <p className="text-sm font-semibold">
              {t('可用工具', 'Available tools')}
            </p>
            <ul className="text-muted-foreground list-inside list-disc text-sm">
              <li>
                <code>generate_deck</code> —{' '}
                {t('文本 → 完整 deck', 'text → a full deck')}
              </li>
              <li>
                <code>list_slide_templates</code> —{' '}
                {t('可用页型', 'available slide types')}
              </li>
              <li>
                <code>list_decks</code> / <code>get_deck</code>
              </li>
              <li>
                <code>publish_deck</code>
              </li>
              <li>
                <code>list_brands</code> / <code>set_active_brand</code>
              </li>
              <li>
                <code>generate_image</code>
              </li>
            </ul>
            <p className="text-muted-foreground text-sm">
              {t('在 ', 'See ')}
              <Link href="/settings/mcp" className="text-primary underline">
                {t('设置 → MCP', 'Settings → MCP')}
              </Link>
              {t(
                ' 查看你的专属端点和连接命令。',
                ' for your personal endpoint and connect command.'
              )}
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute('/docs')({
  component: DocsPage,
});
