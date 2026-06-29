import { z } from 'zod';

import type { SlideTemplate } from './types';

/**
 * deckgene 首批内置 slide_type（见 docs/PRD.md §6.3，~18 个，覆盖叙事弧线）。
 * key 参考 heydecks 命名以便对照，schema/视觉自研。
 * 样式开关：variant（表面色调）、layoutVariant（同内容多版式）—— 在固定 schema 内。
 */

const surface = z.enum(['light', 'subtle', 'dark', 'accent']).optional();

// 复用：短文本 / 多行文本
const short = (max: number) => z.string().max(max);
const long = (max: number) => z.string().max(max);

// 可选 URL：把空串/占位当作未填（AI 生成/改写常返回空 image 串，避免 url 校验炸）
const urlOpt = () =>
  z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().url().optional().catch(undefined)
  );

// ─── Open ─────────────────────────────────────────────────────────────────────

const title: SlideTemplate = {
  key: 'title',
  name: 'Title cover',
  category: 'Open',
  whenToUse:
    'The opening cover: deck title, who it is for, and the date. Always slide one.',
  schema: z.object({
    variant: surface,
    layoutVariant: z
      .enum(['default', 'centered', 'image-right', 'image-fullbleed'])
      .optional(),
    image: urlOpt(),
    eyebrow: short(40).optional(),
    title: short(120),
    subtitle: long(180).optional(),
    client: short(40).optional(),
    date: short(24).optional(),
  }),
};

const agenda: SlideTemplate = {
  key: 'agenda',
  name: 'Agenda',
  category: 'Open',
  whenToUse:
    'What the talk will cover, as a short ordered list. Use near the start of a longer deck.',
  schema: z.object({
    variant: surface,
    eyebrow: short(40).optional(),
    heading: short(80),
    items: z
      .array(z.object({ label: short(80), detail: long(160).optional() }))
      .max(8),
  }),
};

const statement: SlideTemplate = {
  key: 'statement',
  name: 'Statement',
  category: 'Open',
  whenToUse:
    'A single bold thesis with no supporting clutter. Use to land one idea hard.',
  schema: z.object({
    variant: surface,
    eyebrow: short(40).optional(),
    statement: long(220),
    attribution: short(80).optional(),
  }),
};

const chapter: SlideTemplate = {
  key: 'chapter',
  name: 'Chapter divider',
  category: 'Open',
  whenToUse:
    'A section divider between acts of the deck. Use to signal a new part has begun.',
  schema: z.object({
    variant: surface,
    number: short(8).optional(),
    title: short(120),
  }),
};

// ─── Argue ────────────────────────────────────────────────────────────────────

const compare: SlideTemplate = {
  key: 'compare',
  name: 'Compare',
  category: 'Argue',
  whenToUse:
    'Two things side by side (A vs B, us vs them). Use for a head-to-head of exactly two.',
  schema: z.object({
    variant: surface,
    layoutVariant: z.enum(['default', 'vs-stack', 'table']).optional(),
    eyebrow: short(40).optional(),
    heading: long(120).optional(),
    left: z.object({ label: short(24), body: long(220) }),
    right: z.object({ label: short(24), body: long(220) }),
    footnote: long(180).optional(),
  }),
};

const process: SlideTemplate = {
  key: 'process',
  name: 'Process steps',
  category: 'Argue',
  whenToUse:
    'An ordered sequence of steps or a repeatable method. Use when order matters (step 1..n).',
  schema: z.object({
    variant: surface,
    heading: short(80).optional(),
    steps: z
      .array(z.object({ title: short(60), detail: long(160).optional() }))
      .min(2)
      .max(6),
  }),
};

const bullets: SlideTemplate = {
  key: 'bullets',
  name: 'Bullets / checklist',
  category: 'Argue',
  whenToUse:
    'A short list of points or items to tick off. Use for requirements, takeaways, or a do-this list.',
  schema: z.object({
    variant: surface,
    heading: short(80),
    items: z
      .array(z.object({ text: short(120), detail: long(160).optional() }))
      .min(2)
      .max(8),
  }),
};

const swot: SlideTemplate = {
  key: 'swot',
  name: 'SWOT',
  category: 'Argue',
  whenToUse:
    'Strengths, weaknesses, opportunities, threats. Use for a strategic situation read.',
  schema: z.object({
    variant: surface,
    heading: short(80).optional(),
    strengths: z.array(short(80)).max(5),
    weaknesses: z.array(short(80)).max(5),
    opportunities: z.array(short(80)).max(5),
    threats: z.array(short(80)).max(5),
  }),
};

const caseStudy: SlideTemplate = {
  key: 'caseStudy',
  name: 'Case study',
  category: 'Argue',
  whenToUse:
    'A customer story: problem, solution, result. Use for proof with a named example.',
  schema: z.object({
    variant: surface,
    heading: short(80).optional(),
    client: short(40).optional(),
    problem: long(220),
    solution: long(220),
    result: long(220),
  }),
};

// ─── Show ─────────────────────────────────────────────────────────────────────

const stats: SlideTemplate = {
  key: 'stats',
  name: 'Stat row',
  category: 'Show',
  whenToUse:
    'Three or four metrics of equal weight. Use for a quick block of related numbers.',
  schema: z.object({
    variant: surface,
    layoutVariant: z.enum(['row', 'grid-2x2', 'vertical-strip']).optional(),
    eyebrow: short(40).optional(),
    heading: short(80).optional(),
    stats: z
      .array(z.object({ value: short(8), label: short(40) }))
      .min(2)
      .max(4),
  }),
};

const bigNumber: SlideTemplate = {
  key: 'bigNumber',
  name: 'Big number',
  category: 'Show',
  whenToUse:
    'One oversized number or word with a short label. Use when one figure carries the slide.',
  schema: z.object({
    variant: surface,
    layoutVariant: z
      .enum(['default', 'centered-jumbo', 'split-context'])
      .optional(),
    eyebrow: short(40).optional(),
    value: short(12),
    label: short(80),
    body: long(240).optional(),
    source: short(60).optional(),
  }),
};

const kpi: SlideTemplate = {
  key: 'kpi',
  name: 'KPI dashboard',
  category: 'Show',
  whenToUse:
    'Several KPIs with deltas and trend arrows. Use for a proof-of-progress dashboard.',
  schema: z.object({
    variant: surface,
    heading: short(80).optional(),
    kpis: z
      .array(
        z.object({
          label: short(40),
          value: short(12),
          delta: short(12).optional(),
          trend: z.enum(['up', 'down', 'flat']).optional(),
        })
      )
      .min(2)
      .max(6),
  }),
};

const chart: SlideTemplate = {
  key: 'chart',
  name: 'Chart',
  category: 'Show',
  whenToUse:
    'A data visualisation (line, bar, area). Use when a dataset reveals a trend or comparison.',
  schema: z.object({
    variant: surface,
    heading: short(80).optional(),
    chartType: z.enum(['bar', 'line', 'area']),
    series: z
      .array(z.object({ label: short(24), value: z.number() }))
      .min(2)
      .max(12),
    note: long(160).optional(),
  }),
};

const image: SlideTemplate = {
  key: 'image',
  name: 'Image',
  category: 'Show',
  whenToUse:
    'A full-bleed photo with minimal text. Use to set mood or break up dense slides.',
  schema: z.object({
    variant: surface,
    heading: short(80).optional(),
    imageUrl: z.string().url(),
    caption: long(160).optional(),
  }),
};

const timeline: SlideTemplate = {
  key: 'timeline',
  name: 'Timeline',
  category: 'Show',
  whenToUse:
    'Events along a time axis. Use for history, a date sequence, or a track record.',
  schema: z.object({
    variant: surface,
    heading: short(80).optional(),
    events: z
      .array(
        z.object({
          date: short(24),
          title: short(60),
          detail: long(160).optional(),
        })
      )
      .min(2)
      .max(8),
  }),
};

const dataTable: SlideTemplate = {
  key: 'dataTable',
  name: 'Data table',
  category: 'Show',
  whenToUse:
    'A real table of rows and columns. Use when precise tabular data matters.',
  schema: z.object({
    variant: surface,
    heading: short(80).optional(),
    columns: z.array(short(40)).min(2).max(6),
    rows: z.array(z.array(short(60)).max(6)).max(10),
  }),
};

// ─── Close ────────────────────────────────────────────────────────────────────

const cta: SlideTemplate = {
  key: 'cta',
  name: 'CTA close',
  category: 'Close',
  whenToUse:
    'The ask: one clear next step and how to take it. Use to close with an action.',
  schema: z.object({
    variant: surface,
    layoutVariant: z
      .enum(['default', 'split-with-button', 'minimal'])
      .optional(),
    eyebrow: short(40).optional(),
    heading: long(120),
    body: long(180).optional(),
    buttonLabel: short(40).optional(),
    buttonHref: urlOpt(),
    hideButton: z.boolean().optional(),
  }),
};

const contactCard: SlideTemplate = {
  key: 'contactCard',
  name: 'Contact card',
  category: 'Close',
  whenToUse:
    'How to reach you: name, email, links. Use on or near the closing slide.',
  schema: z.object({
    variant: surface,
    heading: short(80).optional(),
    name: short(60).optional(),
    email: z.string().email().optional(),
    links: z
      .array(z.object({ label: short(40), url: z.string().url() }))
      .max(5)
      .optional(),
  }),
};

/** 首批全部模板（注册表数据源）。 */
export const SLIDE_TEMPLATES: SlideTemplate[] = [
  // Open
  title,
  agenda,
  statement,
  chapter,
  // Argue
  compare,
  process,
  bullets,
  swot,
  caseStudy,
  // Show
  stats,
  bigNumber,
  kpi,
  chart,
  image,
  timeline,
  dataTable,
  // Close
  cta,
  contactCard,
];
