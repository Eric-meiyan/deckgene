import type { z } from 'zod';

/**
 * 叙事弧线分类（见 docs/PRD.md §6.2）。
 * 生成管线 plan 步骤按 Open → Argue → Show → Close 选页。
 */
export type SlideCategory = 'Open' | 'Argue' | 'Show' | 'Close';

/**
 * 一个 slide_type 模板 = schema + 元信息（+ P1 渲染组件）。
 * - schema：约束 content 结构，供生成结构化输出 + 校验（写死，强约束）
 * - whenToUse：一句话，供 plan 步骤选页
 * - category：叙事弧线分类
 * 渲染组件在 P1 加入（registry 预留 Component 槽位）。
 */
export interface SlideTemplate {
  key: string;
  name: string;
  category: SlideCategory;
  whenToUse: string;
  schema: z.ZodType;
}

/** 精简 pick-list 条目（list 无参时返回，供发现 API / MCP / plan 使用）。 */
export interface SlideTemplateSummary {
  key: string;
  name: string;
  category: SlideCategory;
  whenToUse: string;
}
