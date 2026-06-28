import { SLIDE_TEMPLATES } from './definitions';
import type {
  SlideCategory,
  SlideTemplate,
  SlideTemplateSummary,
} from './types';

/**
 * slide_type 模板注册表（见 docs/PRD.md §6.4）。
 * 单一来源，被生成管线、渲染、校验、REST `GET /v1/slide-templates`、
 * MCP `list_slide_templates` 共用 —— 保持 web/API 能力对等（§6.6）。
 */

const byKey: Map<string, SlideTemplate> = new Map(
  SLIDE_TEMPLATES.map((t) => [t.key, t])
);

/** 全部模板（含 schema）。 */
export function listSlideTemplates(): SlideTemplate[] {
  return SLIDE_TEMPLATES;
}

/** 精简 pick-list（无 schema）—— 供发现 API / plan 选页用。 */
export function listSlideTemplatesCompact(): SlideTemplateSummary[] {
  return SLIDE_TEMPLATES.map(({ key, name, category, whenToUse }) => ({
    key,
    name,
    category,
    whenToUse,
  }));
}

/** 取单个模板。 */
export function getSlideTemplate(key: string): SlideTemplate | undefined {
  return byKey.get(key);
}

/** key 是否为合法 slide_type。 */
export function isValidSlideType(key: string): boolean {
  return byKey.has(key);
}

/** 按叙事弧线分组。 */
export function listSlideTemplatesByCategory(): Record<
  SlideCategory,
  SlideTemplateSummary[]
> {
  const groups: Record<SlideCategory, SlideTemplateSummary[]> = {
    Open: [],
    Argue: [],
    Show: [],
    Close: [],
  };
  for (const t of SLIDE_TEMPLATES) {
    groups[t.category].push({
      key: t.key,
      name: t.name,
      category: t.category,
      whenToUse: t.whenToUse,
    });
  }
  return groups;
}

export type SlideContentValidation =
  | { ok: true; data: unknown }
  | { ok: false; error: string };

/**
 * 用对应模板的固定 schema 校验 content（生成 assemble / slide 编辑 时调用）。
 * 未知 slide_type 视为校验失败。
 */
export function validateSlideContent(
  slideType: string,
  content: unknown
): SlideContentValidation {
  const tpl = byKey.get(slideType);
  if (!tpl) return { ok: false, error: `unknown slide_type: ${slideType}` };
  const result = tpl.schema.safeParse(content);
  if (result.success) return { ok: true, data: result.data };
  return {
    ok: false,
    error: result.error.issues
      .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('; '),
  };
}
