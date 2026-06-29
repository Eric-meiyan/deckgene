import { createFileRoute } from '@tanstack/react-router';

import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';

const BASE = `${envConfigs.app_url}/api/v1`;
const MCP = `${envConfigs.app_url}/api/mcp`;

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

const TOC = [
  ['intro', 'Introduction'],
  ['auth', 'Authentication'],
  ['errors', 'Errors & credits'],
  ['generate', 'Generate a deck'],
  ['jobs', 'Jobs'],
  ['templates', 'Slide templates'],
  ['decks', 'Decks'],
  ['brands', 'Brands'],
  ['mcp', 'MCP integration'],
];

function DocsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <div className="mb-8">
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground text-xs"
        >
          ← {envConfigs.app_name}
        </Link>
        <h1 className="mt-2 text-3xl font-bold">API & MCP Documentation</h1>
        <p className="text-muted-foreground mt-1">
          Generate on-brand presentation decks programmatically. REST API and
          MCP server.
        </p>
      </div>

      <div className="flex gap-10">
        {/* TOC */}
        <nav className="sticky top-8 hidden h-fit w-44 shrink-0 lg:block">
          <ul className="space-y-1.5 text-sm">
            {TOC.map(([id, label]) => (
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
          <Section id="intro" title="Introduction">
            <p className="text-sm leading-relaxed">
              The {envConfigs.app_name} API turns text into a structured,
              on-brand slide deck. You send a prompt or source text; we plan a
              narrative, fill each slide against a typed schema, apply your
              brand, and return a deck you can publish, embed, or export.
            </p>
            <p className="text-sm">
              <span className="font-semibold">Base URL</span>{' '}
              <code className="bg-muted rounded px-1.5 py-0.5 text-xs">
                {BASE}
              </code>
            </p>
            <p className="text-muted-foreground text-sm">
              All requests and responses are JSON. All endpoints require an API
              key (see Authentication).
            </p>
          </Section>

          <Section id="auth" title="Authentication">
            <p className="text-sm">
              Pass your API key as a Bearer token. Create keys in{' '}
              <Link
                href="/settings/api-keys"
                className="text-primary underline"
              >
                Settings → API Keys
              </Link>
              . Keys are shown once at creation and start with{' '}
              <code className="bg-muted rounded px-1 text-xs">hd_live_</code>.
            </p>
            <Code>{`Authorization: Bearer hd_live_xxxxxxxxxxxxxxxx`}</Code>
          </Section>

          <Section id="errors" title="Errors & credits">
            <p className="text-sm">
              Errors use standard HTTP status codes and a JSON body:
            </p>
            <Code>{`{ "error": { "code": "invalid_input", "message": "..." } }`}</Code>
            <p className="text-sm font-semibold">Error codes</p>
            <ul className="text-muted-foreground list-inside list-disc text-sm">
              <li>
                <code>invalid_key</code> (401) — missing/invalid/revoked key
              </li>
              <li>
                <code>insufficient_credits</code> (402) — not enough credits
              </li>
              <li>
                <code>invalid_input</code> (400) — bad request body
              </li>
              <li>
                <code>not_found</code> (404) — resource does not exist
              </li>
              <li>
                <code>rate_limit</code> (429) — too many requests
              </li>
            </ul>
            <p className="text-muted-foreground text-sm">
              Generating a deck costs{' '}
              <span className="font-semibold">100 credits</span>. Charges are
              refunded automatically if generation fails. Reads (list/get) are
              free.
            </p>
          </Section>

          <Section id="generate" title="Generate a deck">
            <Method m="POST" path="/generate" />
            <p className="text-sm">
              Synchronous: the pipeline runs within the request and returns the
              finished deck. Body parameters:
            </p>
            <ul className="text-muted-foreground list-inside list-disc text-sm">
              <li>
                <code>input</code> (string, required) — prompt or source text,
                up to 8000 chars
              </li>
              <li>
                <code>title</code> (string, optional) — deck title override
              </li>
              <li>
                <code>brand_id</code> (string, optional) — brand to apply;
                defaults to your active brand
              </li>
              <li>
                <code>byok</code> (object, optional) —{' '}
                <code>{`{ "provider": "openai", "api_key": "sk-..." }`}</code>{' '}
                to use your own model key
              </li>
            </ul>
            <Code>{`curl -X POST ${BASE}/generate \\
  -H "Authorization: Bearer hd_live_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "input": "A 6-slide pitch for our AI note-taking app, aimed at investors",
    "title": "Acme Pitch"
  }'`}</Code>
            <p className="text-sm font-semibold">Response</p>
            <Code>{`{
  "job_id": "job_...",
  "status": "succeeded",
  "result": { "deck_id": "deck_...", "slug": "acme-pitch", "slides": 6 },
  "poll": "/api/v1/jobs/job_..."
}`}</Code>
            <p className="text-muted-foreground text-sm">
              On failure the response has <code>{`"status": "failed"`}</code>{' '}
              and an <code>error</code> object (credits are refunded).
            </p>
          </Section>

          <Section id="jobs" title="Jobs">
            <Method m="GET" path="/jobs/{id}" />
            <p className="text-sm">
              Fetch a generation job by id. Generation is synchronous, but the
              job record is retained for auditing and future async batches.
            </p>
            <Code>{`curl ${BASE}/jobs/job_xxx -H "Authorization: Bearer hd_live_xxx"`}</Code>
          </Section>

          <Section id="templates" title="Slide templates">
            <Method m="GET" path="/slide-templates" />
            <p className="text-sm">
              List the built-in slide types (their keys, categories, and when to
              use them). Add <code>?keys=title,bullets</code> to get the full
              JSON Schema for specific types.
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
              List or fetch decks, delete, and toggle publish. A published deck
              gets a public <code>url</code> ({envConfigs.app_url}
              /d/&#123;slug&#125;).
            </p>
            <Code>{`curl ${BASE}/decks/deck_xxx -H "Authorization: Bearer hd_live_xxx"`}</Code>
            <p className="text-sm font-semibold">Deck object</p>
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

          <Section id="brands" title="Brands">
            <div className="space-y-2">
              <Method m="GET" path="/brands" />
              <Method m="POST" path="/brands" />
              <Method m="GET" path="/brands/{id}" />
              <Method m="PATCH" path="/brands/{id}" />
              <Method m="DELETE" path="/brands/{id}" />
              <Method m="POST" path="/brands/set-active" />
            </div>
            <p className="text-sm">
              A brand carries the palette, typography, tone, and logo applied to
              generated decks. Create one and set it active so generation uses
              it by default.
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

          <Section id="mcp" title="MCP integration">
            <p className="text-sm">
              {envConfigs.app_name} ships a Model Context Protocol server, so AI
              clients (Claude, etc.) can create decks as a tool. Endpoint:
            </p>
            <Code>{MCP}</Code>
            <p className="text-sm">
              Connect from Claude Code (use an API key as the bearer token):
            </p>
            <Code>{`claude mcp add ${envConfigs.app_name} \\
  --transport http ${MCP} \\
  --header "Authorization: Bearer hd_live_xxx"`}</Code>
            <p className="text-sm font-semibold">Available tools</p>
            <ul className="text-muted-foreground list-inside list-disc text-sm">
              <li>
                <code>generate_deck</code> — text → a full deck
              </li>
              <li>
                <code>list_slide_templates</code> — available slide types
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
              See{' '}
              <Link href="/settings/mcp" className="text-primary underline">
                Settings → MCP
              </Link>{' '}
              for your personal endpoint and connect command.
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
