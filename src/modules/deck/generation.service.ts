import { z } from 'zod';

import {
  getLLMProvider,
  type LLMProvider,
  type ProviderContext,
} from '@/modules/ai/providers';

import {
  createDeckWithSlides,
  type DeckWithSlides,
  type NewSlideInput,
} from './deck.service';
import {
  getSlideTemplate,
  listSlideTemplates,
  listSlideTemplatesCompact,
} from './templates/registry';

/**
 * 生成管线（见 docs/PRD.md §7）。核心机制：先按 whenToUse 选模板 → 再按固定 schema 填空。
 * Provider 可注入（测试用 stub；生产用 getLLMProvider + BYOK）。
 * 本地版为 inline 执行；部署 CF 时迁移为 Cloudflare Workflow（plan/fill/assemble 为 step）。
 */

const MAX_SLIDES = 20;
const DECK_CREDITS = 100; // 每个 deck 消耗（见 docs/PRD.md §10）
const SLIDE_EDIT_CREDITS = 10; // 单页 AI 改写消耗（见 docs/PRD.md §9.4）

/** 动态构建 plan schema：slide_type 限定为注册表已知 key。 */
function buildPlanSchema() {
  const keys = listSlideTemplates().map((t) => t.key) as [string, ...string[]];
  return z.object({
    title: z.string().max(120),
    slides: z
      .array(
        z.object({
          slide_type: z.enum(keys),
          brief: z.string().max(400),
        })
      )
      .min(3)
      .max(MAX_SLIDES),
  });
}

export type DeckPlan = z.infer<ReturnType<typeof buildPlanSchema>>;

export interface GenOptions {
  slideCount?: number; // 0/undefined = auto
  audience?: string;
  depth?: 'concise' | 'balanced' | 'detailed';
  language?: string; // 'zh' | 'en' | 自由文本
}

function langName(l?: string): string | undefined {
  if (!l || l === 'auto') return undefined;
  if (l === 'zh') return 'Chinese (简体中文)';
  if (l === 'en') return 'English';
  return l;
}

/** 第 1 步：规划——按叙事弧线选模板 + 每页 brief。 */
export async function planDeck(
  provider: LLMProvider,
  input: string,
  opts: { title?: string } & GenOptions = {}
): Promise<DeckPlan> {
  const catalog = listSlideTemplatesCompact()
    .filter((t) => t.key !== 'canvas') // 手绘画布不参与 AI 自动选页
    .map((t) => `- ${t.key} [${t.category}]: ${t.whenToUse}`)
    .join('\n');

  const count =
    opts.slideCount && opts.slideCount > 0
      ? `Produce EXACTLY ${Math.min(opts.slideCount, MAX_SLIDES)} slides.`
      : 'Aim for 5–15 slides unless the input demands otherwise.';
  const lang = langName(opts.language);

  const system = [
    'You are a presentation architect for deckgene.',
    'Plan a deck as an ordered list of slides following the narrative arc:',
    'Open → Argue → Show → Close.',
    'Choose each slide_type ONLY from the catalog below, by its whenToUse.',
    'Do not repeat content across slides.',
    count,
    opts.audience ? `Target audience: ${opts.audience}.` : '',
    lang ? `Write the brief (and later content) in ${lang}.` : '',
    '',
    'Slide type catalog:',
    catalog,
  ]
    .filter(Boolean)
    .join('\n');

  const prompt = [
    opts.title ? `Deck title (suggested): ${opts.title}` : '',
    'Source material:',
    input,
  ]
    .filter(Boolean)
    .join('\n');

  return provider.generateStructured({
    system,
    prompt,
    schema: buildPlanSchema(),
    schemaName: 'deck_plan',
  });
}

/** 第 2 步：填空——按所选 slide_type 的固定 schema 生成 content（含一次重试 + 降级）。 */
export async function fillSlide(
  provider: LLMProvider,
  slideType: string,
  brief: string,
  ctx: {
    deckTitle: string;
    tone?: string;
    audience?: string;
    depth?: 'concise' | 'balanced' | 'detailed';
    language?: string;
  }
): Promise<NewSlideInput> {
  const tpl = getSlideTemplate(slideType);
  if (!tpl) {
    // 未知类型：降级为 statement 占位
    return {
      slideType: 'statement',
      content: { statement: brief.slice(0, 220) },
    };
  }

  const depthHint =
    ctx.depth === 'concise'
      ? 'Be very concise — minimal words.'
      : ctx.depth === 'detailed'
        ? 'Be thorough — richer detail where fields allow.'
        : '';
  const lang = langName(ctx.language);

  const system = [
    `You are writing the content for one slide of the deck "${ctx.deckTitle}".`,
    `Slide type: ${tpl.key} — ${tpl.whenToUse}`,
    ctx.tone ? `Brand tone: ${ctx.tone}.` : '',
    ctx.audience ? `Audience: ${ctx.audience}.` : '',
    lang ? `Write all content in ${lang}.` : '',
    depthHint,
    'Fill the structured fields. Respect every field length limit.',
  ]
    .filter(Boolean)
    .join('\n');

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const content = (await provider.generateStructured({
        system,
        prompt: `Slide brief: ${brief}`,
        schema: tpl.schema,
        schemaName: tpl.key,
      })) as Record<string, unknown>;
      return { slideType: tpl.key, content };
    } catch {
      // retry once, then fall through to placeholder
    }
  }
  // 降级占位（保证整 deck 不因单页失败而崩）
  return {
    slideType: 'statement',
    content: { statement: brief.slice(0, 220) },
  };
}

/**
 * 单页 AI 改写（见 docs/PRD.md §9.4）：按用户指令改写当前页 content，保持 slide_type。
 * 扣 SLIDE_EDIT_CREDITS，失败退款。返回新 content（已按 schema 校验，因走 structured 输出）。
 */
export async function editSlide(
  params: {
    userId: string;
    slideType: string;
    currentContent: Record<string, unknown>;
    instruction: string;
    deckTitle?: string;
    tone?: string;
    language?: string;
    ctx?: ProviderContext;
  },
  deps: { provider?: LLMProvider } = {}
): Promise<Record<string, unknown>> {
  const tpl = getSlideTemplate(params.slideType);
  if (!tpl) throw new Error('unknown_slide_type');
  const provider = deps.provider ?? getLLMProvider(params.ctx);
  const lang = langName(params.language);

  const system = [
    `You are editing one slide ("${tpl.key}") of the deck "${params.deckTitle ?? ''}".`,
    `Slide purpose: ${tpl.whenToUse}`,
    params.tone ? `Brand tone: ${params.tone}.` : '',
    lang ? `Write all content in ${lang}.` : '',
    'Apply the user instruction to the CURRENT content. Keep the same slide type.',
    'Return the FULL updated structured fields. Respect every field length limit.',
  ]
    .filter(Boolean)
    .join('\n');
  const prompt = [
    `Current content (JSON):\n${JSON.stringify(params.currentContent)}`,
    `Instruction: ${params.instruction}`,
  ].join('\n\n');

  const { consume, revoke } = await import('@/modules/credits/service');
  const charge = await consume({
    userId: params.userId,
    credits: SLIDE_EDIT_CREDITS,
    scene: 'slide_edit',
    description: 'AI edit slide',
  });
  if (!charge.success) throw new Error('insufficient_credits');
  try {
    return (await provider.generateStructured({
      system,
      prompt,
      schema: tpl.schema,
      schemaName: tpl.key,
    })) as Record<string, unknown>;
  } catch (e) {
    if (charge.consumedCredit?.id) {
      try {
        await revoke(charge.consumedCredit.id);
      } catch {
        // 退款失败不掩盖原始错误
      }
    }
    throw e;
  }
}

/** 整体编排：plan → 并发 fill → assemble（落库）。 */
export async function generateDeck(
  params: {
    userId: string;
    input: string;
    title?: string;
    brandId?: string | null;
    locale?: string;
    ctx?: ProviderContext;
    tone?: string;
  } & GenOptions,
  deps: { provider?: LLMProvider } = {}
): Promise<DeckWithSlides> {
  const provider = deps.provider ?? getLLMProvider(params.ctx);

  // 0. 解析 brand：未显式指定则用工作区 active brand，并取其 tone 注入填充
  let brandId = params.brandId ?? null;
  let tone = params.tone;
  if (!brandId) {
    const { getActiveBrand } = await import('./brand.service');
    const active = await getActiveBrand(params.userId);
    if (active) {
      brandId = active.id;
      tone = tone ?? active.tone ?? undefined;
    }
  } else if (!tone) {
    const { getBrand } = await import('./brand.service');
    const b = await getBrand(brandId, params.userId);
    tone = b?.tone ?? undefined;
  }

  // 计费：预扣 DECK_CREDITS（见 docs/PRD.md §10）。余额不足直接拒绝；失败退款。
  const { consume, revoke } = await import('@/modules/credits/service');
  const charge = await consume({
    userId: params.userId,
    credits: DECK_CREDITS,
    scene: 'deck_generate',
    description: 'Generate deck',
  });
  if (!charge.success) throw new Error('insufficient_credits');

  try {
    // 1. plan
    const plan = await planDeck(provider, params.input, {
      title: params.title,
      slideCount: params.slideCount,
      audience: params.audience,
      depth: params.depth,
      language: params.language,
    });
    const deckTitle = params.title ?? plan.title;

    // 2. fill（并发 fan-out）
    const slides = await Promise.all(
      plan.slides.map((s) =>
        fillSlide(provider, s.slide_type, s.brief, {
          deckTitle,
          tone,
          audience: params.audience,
          depth: params.depth,
          language: params.language,
        })
      )
    );

    // 3. assemble（落库）
    return await createDeckWithSlides({
      userId: params.userId,
      title: deckTitle,
      brandId,
      locale: params.locale,
      sourceInput: params.input,
      slides,
    });
  } catch (e) {
    // 失败退款
    if (charge.consumedCredit?.id) {
      try {
        await revoke(charge.consumedCredit.id);
      } catch {
        // 退款失败不掩盖原始错误
      }
    }
    throw e;
  }
}
