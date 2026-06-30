import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { envConfigs } from '@/config';
import { getImageProvider } from '@/modules/ai/providers';
import { requireApiKey } from '@/modules/apikeys/service';
import {
  listBrands,
  setActiveBrand,
  toApiBrand,
} from '@/modules/deck/brand.service';
import {
  getDeckWithSlides,
  listDecks,
  publishDeck,
  toApiDeck,
} from '@/modules/deck/deck.service';
import { generateDeck } from '@/modules/deck/generation.service';
import {
  getSlideTemplate,
  listSlideTemplatesCompact,
} from '@/modules/deck/templates/registry';

/**
 * MCP server（HTTP JSON-RPC 2.0，见 docs/PRD.md §9.10）。
 * 工具复用 Core Service —— 与 REST 同源同构（web/API 对等 §6.6）。
 * 鉴权：Authorization: Bearer hd_live_...（与 REST 同一套 key；OAuth/mcp_ 前缀为后续）。
 * 注：与 REST 共用核心，conversational(对话式) 生成即调用同一 generateDeck。
 */

interface Tool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  run: (args: any, userId: string) => Promise<unknown>;
}

const obj = (properties: Record<string, unknown>, required: string[] = []) => ({
  type: 'object',
  properties,
  required,
});

const TOOLS: Tool[] = [
  {
    name: 'list_slide_templates',
    description:
      'Discover slide templates. No args → compact pick-list of all types (key/name/category/whenToUse). With `keys` → full field JSON Schema for those types.',
    inputSchema: obj({
      keys: { type: 'array', items: { type: 'string' } },
    }),
    run: async (args) => {
      if (Array.isArray(args?.keys) && args.keys.length) {
        return args.keys
          .map((k: string) => {
            const t = getSlideTemplate(k);
            return t
              ? {
                  key: t.key,
                  name: t.name,
                  category: t.category,
                  whenToUse: t.whenToUse,
                  schema: z.toJSONSchema(t.schema),
                }
              : null;
          })
          .filter(Boolean);
      }
      return listSlideTemplatesCompact();
    },
  },
  {
    name: 'generate_deck',
    description:
      'Generate a complete deck from text. Plans slides by narrative arc, fills each by its schema, persists. Uses the active brand unless brand_id is given. The deck is created as a DRAFT — the public /d/{slug} URL only works after publish_deck. Returns deck_id, status, edit_url, and (once published) the public url.',
    inputSchema: obj(
      {
        input: { type: 'string', description: 'Source text (<= 8000 chars)' },
        title: { type: 'string' },
        brand_id: { type: 'string' },
      },
      ['input']
    ),
    run: async (args, userId) => {
      const deck = await generateDeck({
        userId,
        input: String(args.input ?? '').slice(0, 8000),
        title: args.title,
        brandId: args.brand_id,
      });
      const published = deck.status === 'published';
      return {
        deck_id: deck.id,
        slug: deck.slug,
        slides: deck.slides.length,
        status: deck.status,
        url: published
          ? `${envConfigs.app_url}/d/${encodeURIComponent(deck.slug)}`
          : null,
        edit_url: `${envConfigs.app_url}/settings/decks/${deck.id}`,
        hint: published
          ? undefined
          : 'Draft created. Call publish_deck with this deck_id to make the public url work.',
      };
    },
  },
  {
    name: 'list_decks',
    description: 'List all decks in the workspace.',
    inputSchema: obj({}),
    run: async (_args, userId) =>
      (await listDecks(userId)).map((d) => toApiDeck(d, envConfigs.app_url)),
  },
  {
    name: 'get_deck',
    description: 'Fetch a deck with all slides.',
    inputSchema: obj({ deck_id: { type: 'string' } }, ['deck_id']),
    run: async (args, userId) => {
      const d = await getDeckWithSlides(args.deck_id, userId);
      if (!d) throw new Error('deck not found');
      return toApiDeck(d, envConfigs.app_url, d.slides);
    },
  },
  {
    name: 'publish_deck',
    description: 'Publish a deck and return its live URL.',
    inputSchema: obj({ deck_id: { type: 'string' } }, ['deck_id']),
    run: async (args, userId) => {
      const d = await publishDeck(args.deck_id, userId);
      if (!d) throw new Error('deck not found');
      return toApiDeck(d, envConfigs.app_url);
    },
  },
  {
    name: 'list_brands',
    description: 'List brands in the workspace (with palette/typography).',
    inputSchema: obj({}),
    run: async (_args, userId) => (await listBrands(userId)).map(toApiBrand),
  },
  {
    name: 'set_active_brand',
    description: 'Set the workspace active (default) brand.',
    inputSchema: obj({ brand_id: { type: 'string' } }, ['brand_id']),
    run: async (args, userId) => {
      const b = await setActiveBrand(args.brand_id, userId);
      if (!b) throw new Error('brand not found');
      return toApiBrand(b);
    },
  },
  {
    name: 'generate_image',
    description: 'Generate an AI image from a prompt. Returns a URL.',
    inputSchema: obj({ prompt: { type: 'string' }, size: { type: 'string' } }, [
      'prompt',
    ]),
    run: async (args) =>
      getImageProvider().generateImage({
        prompt: args.prompt,
        size: args.size,
      }),
  },
];

// ─── JSON-RPC ──────────────────────────────────────────────────────────

function rpcResult(id: unknown, result: unknown) {
  return { jsonrpc: '2.0', id, result };
}
function rpcError(id: unknown, code: number, message: string) {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

async function handleOne(msg: any, userId: string): Promise<unknown | null> {
  const { id, method, params } = msg ?? {};
  switch (method) {
    case 'initialize':
      return rpcResult(id, {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'deckgene', version: '0.1.0' },
      });
    case 'notifications/initialized':
    case 'notifications/cancelled':
      return null; // notification: no response
    case 'tools/list':
      return rpcResult(id, {
        tools: TOOLS.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      });
    case 'tools/call': {
      const tool = TOOLS.find((t) => t.name === params?.name);
      if (!tool) return rpcError(id, -32602, `unknown tool: ${params?.name}`);
      try {
        const out = await tool.run(params?.arguments ?? {}, userId);
        return rpcResult(id, {
          content: [
            {
              type: 'text',
              text: typeof out === 'string' ? out : JSON.stringify(out),
            },
          ],
        });
      } catch (e) {
        return rpcResult(id, {
          content: [{ type: 'text', text: `Error: ${(e as Error).message}` }],
          isError: true,
        });
      }
    }
    default:
      return rpcError(id, -32601, `method not found: ${method}`);
  }
}

async function POST({ request }: { request: Request }) {
  const auth = await requireApiKey(request);
  if (auth instanceof Response) return auth;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify(rpcError(null, -32700, 'Parse error')), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const isBatch = Array.isArray(body);
  const messages = isBatch ? body : [body];
  const responses = (
    await Promise.all(messages.map((m: any) => handleOne(m, auth.userId)))
  ).filter((r) => r !== null);

  return new Response(
    JSON.stringify(isBatch ? responses : (responses[0] ?? null)),
    {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }
  );
}

export const Route = createFileRoute('/api/mcp')({
  server: { handlers: { POST } },
});
