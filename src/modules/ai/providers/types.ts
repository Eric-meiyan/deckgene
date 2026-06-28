import type { z } from 'zod';

/**
 * Provider 抽象层（见 docs/PRD.md §8）。
 * 目标：LLM 文本生成 + 生图都可在配置中切换 provider，不改业务代码；
 * 并支持 BYOK（客户自带模型密钥，内容不经手平台账号）。
 */

/**
 * 调用上下文。BYOK 解析顺序（见 §8.3）：
 *   ctx.apiKey（客户自带）→ 客户账号默认 → 平台默认（env）。
 */
export interface ProviderContext {
  /** 覆盖默认 provider（claude | openai | deepseek ...） */
  provider?: string;
  /** 覆盖默认 model */
  model?: string;
  /** BYOK：客户自带密钥（最高优先级，永不日志/回显） */
  apiKey?: string;
}

export interface GenerateStructuredOptions<T> {
  system?: string;
  prompt: string;
  /** content 的 zod schema —— 作为结构化输出约束传给模型 */
  schema: z.ZodType<T>;
  /** schema 名称（部分 provider 的 structured output 需要） */
  schemaName?: string;
  model?: string;
}

export interface GenerateTextOptions {
  system?: string;
  prompt: string;
  model?: string;
}

export interface LLMProvider {
  readonly name: string;
  /** 结构化生成：返回符合 schema 的对象（已用 schema 校验/coerce）。 */
  generateStructured<T>(opts: GenerateStructuredOptions<T>): Promise<T>;
  /** 纯文本生成。 */
  generateText(opts: GenerateTextOptions): Promise<string>;
}

export interface GenerateImageOptions {
  prompt: string;
  /** 形如 "1280x720" */
  size?: string;
  style?: string;
}

export interface ImageProvider {
  readonly name: string;
  /** 生成图片，返回可访问 URL（P1 起落 R2）。 */
  generateImage(opts: GenerateImageOptions): Promise<{ url: string }>;
}
