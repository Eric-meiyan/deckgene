import { z } from 'zod';

import type {
  GenerateStructuredOptions,
  GenerateTextOptions,
  LLMProvider,
} from './types';

const API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const DEFAULT_MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 4096;

/**
 * Anthropic Claude provider。结构化输出用「强制 tool 调用」：把 zod schema 转成
 * JSON Schema 作为 tool 的 input_schema，并 tool_choice 强制模型调用它。
 */
export class ClaudeProvider implements LLMProvider {
  readonly name = 'claude';
  constructor(
    private apiKey: string,
    private defaultModel = DEFAULT_MODEL
  ) {}

  private async call(body: unknown): Promise<any> {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`claude ${res.status}: ${text.slice(0, 500)}`);
    }
    return res.json();
  }

  async generateStructured<T>(opts: GenerateStructuredOptions<T>): Promise<T> {
    const jsonSchema = z.toJSONSchema(opts.schema);
    const toolName = opts.schemaName ?? 'emit';
    const data = await this.call({
      model: opts.model ?? this.defaultModel,
      max_tokens: MAX_TOKENS,
      system: opts.system,
      tools: [
        {
          name: toolName,
          description: 'Return the result in this exact structure.',
          input_schema: jsonSchema,
        },
      ],
      tool_choice: { type: 'tool', name: toolName },
      messages: [{ role: 'user', content: opts.prompt }],
    });
    const block = (data.content ?? []).find(
      (b: any) => b.type === 'tool_use' && b.name === toolName
    );
    if (!block) throw new Error('claude: no tool_use in response');
    return opts.schema.parse(block.input);
  }

  async generateText(opts: GenerateTextOptions): Promise<string> {
    const data = await this.call({
      model: opts.model ?? this.defaultModel,
      max_tokens: MAX_TOKENS,
      system: opts.system,
      messages: [{ role: 'user', content: opts.prompt }],
    });
    return (data.content ?? [])
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('');
  }
}
