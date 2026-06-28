import { ClaudeProvider } from './claude';
import { OpenAIProvider } from './openai';
import { PollinationsImageProvider } from './pollinations';
import type { ImageProvider, LLMProvider, ProviderContext } from './types';

/**
 * 工厂：按配置 + BYOK 上下文返回 provider 实例（见 docs/PRD.md §8.3）。
 * BYOK 解析顺序：ctx.apiKey（客户自带）→ 平台默认（env）。
 * 注：env 读取为本地/Node 形态；Cloudflare 上由 server 把 env 注入 process.env。
 */
function env(key: string): string | undefined {
  // Cloudflare Workers：secrets/vars 在 binding env（server.ts 存于 __CF_ENV__）；
  // 本地/Node：process.env。两处都查，保证两种运行时都能取到 key。
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cf = (globalThis as any).__CF_ENV__;
  if (cf && cf[key] != null) return cf[key];
  return typeof process !== 'undefined' ? process.env?.[key] : undefined;
}

export function getLLMProvider(ctx?: ProviderContext): LLMProvider {
  const provider = ctx?.provider ?? env('LLM_PROVIDER') ?? 'claude';
  const model = ctx?.model ?? env('LLM_MODEL');

  switch (provider) {
    case 'claude': {
      const key = ctx?.apiKey ?? env('ANTHROPIC_API_KEY');
      if (!key) throw new Error('missing ANTHROPIC_API_KEY (or BYOK apiKey)');
      return new ClaudeProvider(key, model);
    }
    case 'openai': {
      const key = ctx?.apiKey ?? env('OPENAI_API_KEY');
      if (!key) throw new Error('missing OPENAI_API_KEY (or BYOK apiKey)');
      return new OpenAIProvider(key, model);
    }
    case 'deepseek': {
      const key = ctx?.apiKey ?? env('DEEPSEEK_API_KEY');
      if (!key) throw new Error('missing DEEPSEEK_API_KEY (or BYOK apiKey)');
      // DeepSeek 不支持 json_schema，用 json_object 模式（schema 注入 prompt）
      return new OpenAIProvider(
        key,
        model ?? 'deepseek-chat',
        'https://api.deepseek.com/chat/completions',
        'json_object'
      );
    }
    default:
      throw new Error(`unknown LLM provider: ${provider}`);
  }
}

export function getImageProvider(ctx?: ProviderContext): ImageProvider {
  const provider = ctx?.provider ?? env('IMAGE_PROVIDER') ?? 'pollinations';
  switch (provider) {
    case 'pollinations':
      return new PollinationsImageProvider();
    // TODO(P2): replicate / openai-image，复用 ShipAny @/core/ai
    default:
      throw new Error(`unknown image provider: ${provider}`);
  }
}
