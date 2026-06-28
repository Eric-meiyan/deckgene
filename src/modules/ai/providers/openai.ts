import { z } from 'zod';

import type {
  GenerateStructuredOptions,
  GenerateTextOptions,
  LLMProvider,
} from './types';

const API_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-4o-mini';

/**
 * OpenAI provider（也兼容 DeepSeek 等 OpenAI 协议端点，传入 baseUrl 即可）。
 * 结构化输出用 response_format: json_schema。
 */
/**
 * 结构化输出模式：
 * - 'json_schema'：OpenAI 原生 response_format（强约束）
 * - 'json_object'：JSON 模式 + schema 注入 prompt（DeepSeek 等不支持 json_schema 的端点）
 */
export type StructuredMode = 'json_schema' | 'json_object';

export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai';
  constructor(
    private apiKey: string,
    private defaultModel = DEFAULT_MODEL,
    private baseUrl = API_URL,
    private structuredMode: StructuredMode = 'json_schema'
  ) {}

  private async call(body: unknown): Promise<any> {
    const res = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`openai ${res.status}: ${text.slice(0, 500)}`);
    }
    return res.json();
  }

  async generateStructured<T>(opts: GenerateStructuredOptions<T>): Promise<T> {
    const jsonSchema = z.toJSONSchema(opts.schema);

    let messages: { role: string; content: string }[];
    let response_format: unknown;

    if (this.structuredMode === 'json_object') {
      // DeepSeek 等：JSON 模式 + schema 注入（prompt 必须含 "json" 字样）
      const schemaInstruction =
        `You must respond with a single JSON object that conforms to this JSON Schema:\n` +
        `${JSON.stringify(jsonSchema)}\n` +
        `Respond with JSON only — no prose, no markdown fences.`;
      messages = [
        {
          role: 'system',
          content: opts.system
            ? `${opts.system}\n\n${schemaInstruction}`
            : schemaInstruction,
        },
        { role: 'user', content: opts.prompt },
      ];
      response_format = { type: 'json_object' };
    } else {
      messages = [
        ...(opts.system ? [{ role: 'system', content: opts.system }] : []),
        { role: 'user', content: opts.prompt },
      ];
      response_format = {
        type: 'json_schema',
        json_schema: {
          name: opts.schemaName ?? 'result',
          schema: jsonSchema,
          strict: false,
        },
      };
    }

    const data = await this.call({
      model: opts.model ?? this.defaultModel,
      messages,
      response_format,
    });
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('openai: empty response');
    return opts.schema.parse(JSON.parse(content));
  }

  async generateText(opts: GenerateTextOptions): Promise<string> {
    const data = await this.call({
      model: opts.model ?? this.defaultModel,
      messages: [
        ...(opts.system ? [{ role: 'system', content: opts.system }] : []),
        { role: 'user', content: opts.prompt },
      ],
    });
    return data.choices?.[0]?.message?.content ?? '';
  }
}
