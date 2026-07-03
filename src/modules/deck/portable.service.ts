import { z } from 'zod';

import type { Brand } from '@/config/db/schema';

import type { DeckWithSlides, NewSlideInput } from './deck.service';
import { validateSlideContent } from './templates/registry';

/**
 * Deck 可移植格式（deckgene ↔ deckgene 迁移）。
 * PPTX/PDF 是有损的，还原不回 deckgene 的页型；此格式无损保留
 * slide_type + content + brand，实例间可导出/导入。见对话 §"跨实例导入"。
 */

export const PORTABLE_FORMAT = 'deckgene-deck';
export const PORTABLE_VERSION = 1;

export interface PortableBrand {
  name: string;
  palette?: Record<string, string> | null;
  typography?: Record<string, string> | null;
  tone?: string | null;
  logo_url?: string | null;
}

export interface PortableDeck {
  format: string;
  version: number;
  /** 源实例 origin，仅供参考/排查；图片相对路径导出时已补成绝对 URL。 */
  source_origin: string;
  deck: { title: string; locale: string };
  brand: PortableBrand | null;
  slides: {
    slide_type: string;
    order: number;
    content: Record<string, unknown>;
    notes?: string | null;
  }[];
}

/**
 * 递归把站内相对资源路径（/assets/…、/uploads/…）补成源站绝对 URL，
 * 使导出包在其它实例也能显示图片；http(s):// 与 data: 原样保留。
 */
export function absolutizeAssetUrls<T>(value: T, origin: string): T {
  if (typeof value === 'string') {
    if (value.startsWith('/assets/') || value.startsWith('/uploads/')) {
      return `${origin.replace(/\/+$/, '')}${value}` as unknown as T;
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((v) => absolutizeAssetUrls(v, origin)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = absolutizeAssetUrls(v, origin);
    }
    return out as unknown as T;
  }
  return value;
}

/** 把 deck（+brand）序列化为可移植 JSON；图片相对路径补成源站绝对 URL。 */
export function buildPortableDeck(
  deck: DeckWithSlides,
  brand: Brand | null,
  origin: string
): PortableDeck {
  return {
    format: PORTABLE_FORMAT,
    version: PORTABLE_VERSION,
    source_origin: origin.replace(/\/+$/, ''),
    deck: { title: deck.title, locale: deck.locale },
    brand: brand
      ? {
          name: brand.name,
          palette: brand.palette ?? null,
          typography: brand.typography ?? null,
          tone: brand.tone ?? null,
          logo_url: absolutizeAssetUrls(brand.logoUrl ?? null, origin),
        }
      : null,
    slides: deck.slides.map((s) => ({
      slide_type: s.slideType,
      order: s.order,
      content: absolutizeAssetUrls(
        (s.content ?? {}) as Record<string, unknown>,
        origin
      ),
      notes: s.notes ?? null,
    })),
  };
}

const portableSchema = z.object({
  // format/version 宽松校验：只要 slides 结构对就尽量吃下
  format: z.string().optional(),
  version: z.number().optional(),
  source_origin: z.string().optional(),
  deck: z.object({
    title: z.string().min(1).max(200),
    locale: z.string().optional(),
  }),
  brand: z
    .object({
      name: z.string().min(1).max(120),
      palette: z.record(z.string(), z.string()).nullish(),
      typography: z.record(z.string(), z.string()).nullish(),
      tone: z.string().nullish(),
      logo_url: z.string().nullish(),
    })
    .nullish(),
  slides: z
    .array(
      z.object({
        slide_type: z.string(),
        order: z.number().optional(),
        content: z.record(z.string(), z.unknown()).default({}),
        notes: z.string().nullish(),
      })
    )
    .max(500),
});

export interface ParsedPortableDeck {
  title: string;
  locale: string;
  brand: PortableBrand | null;
  slides: NewSlideInput[];
  /** 被跳过的页（未知页型或内容校验失败），供 UI 提示。 */
  skipped: { index: number; slide_type: string; reason: string }[];
}

/**
 * 解析并校验导入包：逐页用对应 slide_type 的 zod schema 校验，
 * 合法页保留（用校验后的规范内容），非法/未知页型跳过并记录原因。
 */
export function parsePortableDeck(
  raw: unknown
): { ok: true; data: ParsedPortableDeck } | { ok: false; error: string } {
  const parsed = portableSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues
        .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
        .join('; '),
    };
  }
  const p = parsed.data;

  // 按 order 排序后重新编号，导入端以数组顺序落库
  const ordered = [...p.slides].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const slides: NewSlideInput[] = [];
  const skipped: ParsedPortableDeck['skipped'] = [];
  ordered.forEach((s, index) => {
    const v = validateSlideContent(s.slide_type, s.content);
    if (v.ok) {
      slides.push({
        slideType: s.slide_type,
        content: v.data as Record<string, unknown>,
        notes: s.notes ?? undefined,
      });
    } else {
      skipped.push({ index, slide_type: s.slide_type, reason: v.error });
    }
  });

  if (slides.length === 0) {
    return {
      ok: false,
      error:
        skipped.length > 0
          ? `没有可导入的有效页（${skipped.length} 页被跳过）`
          : '导入包中没有幻灯片',
    };
  }

  return {
    ok: true,
    data: {
      title: p.deck.title,
      locale: p.deck.locale || 'en',
      brand: p.brand ?? null,
      slides,
      skipped,
    },
  };
}
