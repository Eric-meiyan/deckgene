import { z } from 'zod';

import type { SlideTemplate } from './types';

/**
 * deckgene 首批内置 slide_type（见 docs/PRD.md §6.3，~18 个，覆盖叙事弧线）。
 * key 参考 heydecks 命名以便对照，schema/视觉自研。
 * 样式开关：variant（表面色调）、layoutVariant（同内容多版式）—— 在固定 schema 内。
 */

const surface = z
  .enum(['light', 'subtle', 'dark', 'accent'])
  .optional()
  .catch(undefined);

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
      .optional()
      .catch(undefined),
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
    layoutVariant: z
      .enum(['default', 'vs-stack', 'table'])
      .optional()
      .catch(undefined),
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
    layoutVariant: z
      .enum(['row', 'grid-2x2', 'vertical-strip'])
      .optional()
      .catch(undefined),
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
      .optional()
      .catch(undefined),
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
          trend: z.enum(['up', 'down', 'flat']).optional().catch(undefined),
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
      .optional()
      .catch(undefined),
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

// ════════ 批次 1：对齐 heydecks（Open 5 + Close 5 + Argue 10）════════

// ── Open ──
const author: SlideTemplate = {
  key: 'author',
  name: 'Author',
  category: 'Open',
  whenToUse:
    'Introduce the presenter with name, role, and a line of credibility.',
  schema: z.object({
    variant: surface,
    name: short(60),
    role: short(80).optional(),
    bio: long(220).optional(),
    avatarUrl: urlOpt(),
  }),
};
const toc: SlideTemplate = {
  key: 'toc',
  name: 'Table of contents',
  category: 'Open',
  whenToUse:
    "A numbered table of contents for the deck's sections. Use for longer, structured decks.",
  schema: z.object({
    variant: surface,
    heading: short(80).optional(),
    items: z
      .array(z.object({ label: short(80), note: short(80).optional() }))
      .min(2)
      .max(12),
  }),
};
const anecdote: SlideTemplate = {
  key: 'anecdote',
  name: 'Anecdote',
  category: 'Open',
  whenToUse: 'Open with a short story that sets up the problem.',
  schema: z.object({
    variant: surface,
    eyebrow: short(40).optional(),
    story: long(400),
    takeaway: long(160).optional(),
  }),
};
const manifesto: SlideTemplate = {
  key: 'manifesto',
  name: 'Manifesto',
  category: 'Open',
  whenToUse:
    'A bold declaration of beliefs. Use for vision or a rallying thesis.',
  schema: z.object({
    variant: surface,
    eyebrow: short(40).optional(),
    lines: z.array(short(120)).min(2).max(6),
  }),
};
const dropCap: SlideTemplate = {
  key: 'dropCap',
  name: 'Drop cap',
  category: 'Open',
  whenToUse: 'An editorial opening paragraph with an oversized initial.',
  schema: z.object({
    variant: surface,
    eyebrow: short(40).optional(),
    body: long(600),
  }),
};

// ── Argue ──
const calloutCard: SlideTemplate = {
  key: 'calloutCard',
  name: 'Callout card',
  category: 'Argue',
  whenToUse: 'One highlighted note, warning, or takeaway.',
  schema: z.object({
    variant: surface,
    kind: z.enum(['info', 'warning', 'success']).optional().catch(undefined),
    title: short(80),
    body: long(280),
  }),
};
const beforeAfter: SlideTemplate = {
  key: 'beforeAfter',
  name: 'Before / After',
  category: 'Argue',
  whenToUse: 'A start state and an end state. Use to show a transformation.',
  schema: z.object({
    variant: surface,
    heading: short(80).optional(),
    before: z.object({ label: short(24), body: long(220) }),
    after: z.object({ label: short(24), body: long(220) }),
  }),
};
const testimonial: SlideTemplate = {
  key: 'testimonial',
  name: 'Testimonial',
  category: 'Argue',
  whenToUse: 'One customer quote with attribution.',
  schema: z.object({
    variant: surface,
    quote: long(320),
    author: short(60).optional(),
    role: short(80).optional(),
  }),
};
const faq: SlideTemplate = {
  key: 'faq',
  name: 'FAQ / objections',
  category: 'Argue',
  whenToUse: 'Common questions with short answers. Use to pre-empt objections.',
  schema: z.object({
    variant: surface,
    heading: short(80).optional(),
    items: z
      .array(z.object({ q: short(120), a: long(220) }))
      .min(1)
      .max(6),
  }),
};
const checklist: SlideTemplate = {
  key: 'checklist',
  name: 'Checklist',
  category: 'Argue',
  whenToUse: 'Items to tick off. Use for requirements or a do-this list.',
  schema: z.object({
    variant: surface,
    heading: short(80).optional(),
    items: z.array(short(120)).min(2).max(10),
  }),
};
const valueProp: SlideTemplate = {
  key: 'valueProp',
  name: 'Value proposition',
  category: 'Argue',
  whenToUse: "The core value proposition and who it's for.",
  schema: z.object({
    variant: surface,
    eyebrow: short(40).optional(),
    statement: long(240),
    forWho: short(120).optional(),
  }),
};
const principle: SlideTemplate = {
  key: 'principle',
  name: 'Principle',
  category: 'Argue',
  whenToUse: 'One guiding principle stated and explained.',
  schema: z.object({
    variant: surface,
    number: short(8).optional(),
    title: short(80),
    body: long(300),
  }),
};
const actionItems: SlideTemplate = {
  key: 'actionItems',
  name: 'Action items',
  category: 'Argue',
  whenToUse: 'Next steps with owners and due dates.',
  schema: z.object({
    variant: surface,
    heading: short(80).optional(),
    items: z
      .array(
        z.object({
          task: short(120),
          owner: short(40).optional(),
          due: short(40).optional(),
        })
      )
      .min(1)
      .max(8),
  }),
};
const proConCard: SlideTemplate = {
  key: 'proConCard',
  name: 'Pro / Con card',
  category: 'Argue',
  whenToUse: 'Pros on one side, cons on the other.',
  schema: z.object({
    variant: surface,
    heading: short(80).optional(),
    pros: z.array(short(100)).min(1).max(6),
    cons: z.array(short(100)).min(1).max(6),
  }),
};
const mythVsReality: SlideTemplate = {
  key: 'mythVsReality',
  name: 'Myth vs reality',
  category: 'Argue',
  whenToUse: 'A misconception paired with the truth.',
  schema: z.object({
    variant: surface,
    heading: short(80).optional(),
    myth: long(220),
    reality: long(220),
  }),
};

// ── Close ──
const pullQuoteWall: SlideTemplate = {
  key: 'pullQuoteWall',
  name: 'Quote wall',
  category: 'Close',
  whenToUse: 'Several short quotes arranged together.',
  schema: z.object({
    variant: surface,
    quotes: z
      .array(z.object({ text: long(160), author: short(60).optional() }))
      .min(2)
      .max(6),
  }),
};
const quoteGrid: SlideTemplate = {
  key: 'quoteGrid',
  name: 'Quote grid',
  category: 'Close',
  whenToUse: 'A grid of several quotes. Use for multiple testimonials at once.',
  schema: z.object({
    variant: surface,
    heading: short(80).optional(),
    quotes: z
      .array(z.object({ text: long(160), author: short(60).optional() }))
      .min(2)
      .max(6),
  }),
};
const resources: SlideTemplate = {
  key: 'resources',
  name: 'Resources',
  category: 'Close',
  whenToUse: 'Links and references to go deeper.',
  schema: z.object({
    variant: surface,
    heading: short(80).optional(),
    items: z
      .array(
        z.object({
          label: short(80),
          url: urlOpt(),
          note: short(80).optional(),
        })
      )
      .min(1)
      .max(8),
  }),
};
const thanksClose: SlideTemplate = {
  key: 'thanksClose',
  name: 'Thanks / close',
  category: 'Close',
  whenToUse: 'A warm closing thank-you. Use as the final slide.',
  schema: z.object({
    variant: surface,
    heading: short(80),
    subtitle: long(180).optional(),
  }),
};
const offerStack: SlideTemplate = {
  key: 'offerStack',
  name: 'Offer stack',
  category: 'Close',
  whenToUse: "A bundle's components and value versus price.",
  schema: z.object({
    variant: surface,
    heading: short(80).optional(),
    items: z
      .array(z.object({ label: short(80), value: short(24).optional() }))
      .min(1)
      .max(8),
    price: short(24).optional(),
    note: long(160).optional(),
  }),
};

// ════════ 批次 2：Argue 剩余 14 ════════
const lowHigh = () => z.enum(['low', 'high']).optional().catch(undefined);
const lowMedHigh = () =>
  z.enum(['low', 'med', 'high']).optional().catch(undefined);

const exercise: SlideTemplate = {
  key: 'exercise',
  name: 'Exercise',
  category: 'Argue',
  whenToUse: 'A hands-on task for the audience. Use in workshops and training.',
  schema: z.object({
    variant: surface,
    heading: short(80).optional(),
    prompt: long(300),
    steps: z.array(short(120)).max(6).optional(),
    time: short(24).optional(),
  }),
};
const quadrant: SlideTemplate = {
  key: 'quadrant',
  name: '2×2 quadrant',
  category: 'Argue',
  whenToUse: 'A 2x2 matrix positioning items on two axes.',
  schema: z.object({
    variant: surface,
    heading: short(80).optional(),
    xAxis: short(40).optional(),
    yAxis: short(40).optional(),
    items: z
      .array(z.object({ label: short(40), x: lowHigh(), y: lowHigh() }))
      .max(8),
  }),
};
const comparisonMatrix: SlideTemplate = {
  key: 'comparisonMatrix',
  name: 'Comparison matrix',
  category: 'Argue',
  whenToUse:
    'Many options scored across criteria. Use for a feature comparison.',
  schema: z.object({
    variant: surface,
    heading: short(80).optional(),
    colA: short(24),
    colB: short(24),
    colC: short(24).optional(),
    rows: z
      .array(
        z.object({
          label: short(60),
          a: short(24).optional(),
          b: short(24).optional(),
          c: short(24).optional(),
        })
      )
      .min(1)
      .max(8),
  }),
};
const recipe: SlideTemplate = {
  key: 'recipe',
  name: 'Recipe',
  category: 'Argue',
  whenToUse:
    'Ingredients plus a method. Use for a how-to with inputs and steps.',
  schema: z.object({
    variant: surface,
    heading: short(80).optional(),
    ingredients: z.array(short(80)).min(1).max(8),
    steps: z.array(short(120)).min(1).max(8),
  }),
};
const phaseStrip: SlideTemplate = {
  key: 'phaseStrip',
  name: 'Phase strip',
  category: 'Argue',
  whenToUse: 'A few phases as a horizontal strip. Use for a high-level plan.',
  schema: z.object({
    variant: surface,
    heading: short(80).optional(),
    phases: z
      .array(z.object({ label: short(40), detail: short(80).optional() }))
      .min(2)
      .max(5),
  }),
};
const riskRegister: SlideTemplate = {
  key: 'riskRegister',
  name: 'Risk register',
  category: 'Argue',
  whenToUse: 'Risks with likelihood, impact, and mitigation.',
  schema: z.object({
    variant: surface,
    heading: short(80).optional(),
    risks: z
      .array(
        z.object({
          risk: short(120),
          likelihood: lowMedHigh(),
          impact: lowMedHigh(),
          mitigation: short(120).optional(),
        })
      )
      .min(1)
      .max(6),
  }),
};
const quiz: SlideTemplate = {
  key: 'quiz',
  name: 'Quiz question',
  category: 'Argue',
  whenToUse: 'A question with answer options. Use to check understanding.',
  schema: z.object({
    variant: surface,
    question: long(200),
    options: z.array(short(80)).min(2).max(5),
    answer: short(80).optional(),
  }),
};
const reflection: SlideTemplate = {
  key: 'reflection',
  name: 'Reflection prompt',
  category: 'Argue',
  whenToUse: 'A reflective prompt. Use to pause and have people think.',
  schema: z.object({
    variant: surface,
    eyebrow: short(40).optional(),
    prompt: long(300),
  }),
};
const statusUpdate: SlideTemplate = {
  key: 'statusUpdate',
  name: 'Status update',
  category: 'Argue',
  whenToUse: 'Progress across workstreams. Use for a recurring update.',
  schema: z.object({
    variant: surface,
    heading: short(80).optional(),
    items: z
      .array(
        z.object({
          workstream: short(60),
          status: z
            .enum(['on-track', 'at-risk', 'off-track'])
            .optional()
            .catch(undefined),
          note: short(120).optional(),
        })
      )
      .min(1)
      .max(6),
  }),
};
const okr: SlideTemplate = {
  key: 'okr',
  name: 'OKR',
  category: 'Argue',
  whenToUse: 'Objectives with measurable key results.',
  schema: z.object({
    variant: surface,
    objective: long(160),
    keyResults: z.array(short(120)).min(1).max(5),
  }),
};
const decisionMatrix: SlideTemplate = {
  key: 'decisionMatrix',
  name: 'Decision matrix',
  category: 'Argue',
  whenToUse: 'Weighted scoring of options with a winner.',
  schema: z.object({
    variant: surface,
    heading: short(80).optional(),
    options: z
      .array(
        z.object({
          label: short(60),
          score: short(16).optional(),
          note: short(80).optional(),
        })
      )
      .min(2)
      .max(6),
    winner: short(60).optional(),
  }),
};
const raci: SlideTemplate = {
  key: 'raci',
  name: 'RACI matrix',
  category: 'Argue',
  whenToUse: 'Responsible, Accountable, Consulted, Informed. Assign roles.',
  schema: z.object({
    variant: surface,
    heading: short(80).optional(),
    rows: z
      .array(
        z.object({
          task: short(60),
          responsible: short(40).optional(),
          accountable: short(40).optional(),
          consulted: short(40).optional(),
          informed: short(40).optional(),
        })
      )
      .min(1)
      .max(8),
  }),
};
const socialProof: SlideTemplate = {
  key: 'socialProof',
  name: 'Social proof',
  category: 'Argue',
  whenToUse:
    'Logos, quotes, and numbers stacked. Use to build credibility fast.',
  schema: z.object({
    variant: surface,
    heading: short(80).optional(),
    logos: z.array(short(40)).max(8).optional(),
    quote: long(200).optional(),
    stats: z
      .array(z.object({ value: short(12), label: short(40) }))
      .max(4)
      .optional(),
  }),
};
const learningObjectives: SlideTemplate = {
  key: 'learningObjectives',
  name: 'Learning objectives',
  category: 'Argue',
  whenToUse:
    'What the audience will be able to do after. Use to open a lesson.',
  schema: z.object({
    variant: surface,
    heading: short(80).optional(),
    items: z.array(short(120)).min(1).max(6),
  }),
};

// ════════ 批次 3：Show 前 18 ════════
const roadmap: SlideTemplate = {
  key: 'roadmap',
  name: 'Roadmap',
  category: 'Show',
  whenToUse: 'Dated milestones along a path. Use to show what ships when.',
  schema: z.object({
    variant: surface,
    heading: short(80).optional(),
    milestones: z
      .array(
        z.object({
          date: short(24),
          title: short(60),
          detail: short(120).optional(),
        })
      )
      .min(2)
      .max(6),
  }),
};
const services: SlideTemplate = {
  key: 'services',
  name: 'Service grid',
  category: 'Show',
  whenToUse: 'A set of offerings or capabilities as cards.',
  schema: z.object({
    variant: surface,
    heading: short(80).optional(),
    items: z
      .array(z.object({ title: short(40), detail: long(120).optional() }))
      .min(2)
      .max(6),
  }),
};
const pricing: SlideTemplate = {
  key: 'pricing',
  name: 'Pricing',
  category: 'Show',
  whenToUse: 'Pricing tiers with features and prices.',
  schema: z.object({
    variant: surface,
    heading: short(80).optional(),
    tiers: z
      .array(
        z.object({
          name: short(40),
          price: short(24),
          features: long(200).optional(),
        })
      )
      .min(2)
      .max(4),
  }),
};
const team: SlideTemplate = {
  key: 'team',
  name: 'Team grid',
  category: 'Show',
  whenToUse: 'The people, with photos, names, and roles.',
  schema: z.object({
    variant: surface,
    heading: short(80).optional(),
    members: z
      .array(
        z.object({
          name: short(40),
          role: short(60).optional(),
          avatarUrl: urlOpt(),
        })
      )
      .min(1)
      .max(8),
  }),
};
const logos: SlideTemplate = {
  key: 'logos',
  name: 'Client logos',
  category: 'Show',
  whenToUse: 'A wall of customer or partner logos.',
  schema: z.object({
    variant: surface,
    heading: short(80).optional(),
    logos: z.array(short(40)).min(2).max(12),
  }),
};
const techStack: SlideTemplate = {
  key: 'techStack',
  name: 'Tech stack',
  category: 'Show',
  whenToUse: 'The technologies in use, grouped.',
  schema: z.object({
    variant: surface,
    heading: short(80).optional(),
    groups: z
      .array(z.object({ category: short(40), tools: short(160) }))
      .min(1)
      .max(6),
  }),
};
const integrations: SlideTemplate = {
  key: 'integrations',
  name: 'Integrations',
  category: 'Show',
  whenToUse: 'What the product connects to. Show your integration ecosystem.',
  schema: z.object({
    variant: surface,
    heading: short(80).optional(),
    items: z.array(short(40)).min(2).max(12),
  }),
};
const productShowcase: SlideTemplate = {
  key: 'productShowcase',
  name: 'Product showcase',
  category: 'Show',
  whenToUse: 'Product screenshots with captions.',
  schema: z.object({
    variant: surface,
    heading: short(80).optional(),
    items: z
      .array(z.object({ imageUrl: urlOpt(), caption: short(80).optional() }))
      .min(1)
      .max(4),
  }),
};
const releaseNotes: SlideTemplate = {
  key: 'releaseNotes',
  name: 'Release notes',
  category: 'Show',
  whenToUse: 'What shipped in a release. Use for a changelog.',
  schema: z.object({
    variant: surface,
    heading: short(80).optional(),
    version: short(24).optional(),
    items: z
      .array(
        z.object({
          kind: z.enum(['new', 'fix', 'improve']).optional().catch(undefined),
          text: short(120),
        })
      )
      .min(1)
      .max(8),
  }),
};
const codeBlock: SlideTemplate = {
  key: 'codeBlock',
  name: 'Code block',
  category: 'Show',
  whenToUse: 'A real code snippet with syntax. Use for developer content.',
  schema: z.object({
    variant: surface,
    heading: short(80).optional(),
    language: short(24).optional(),
    code: long(900),
  }),
};
const terminal: SlideTemplate = {
  key: 'terminal',
  name: 'Terminal',
  category: 'Show',
  whenToUse: 'A command-line session. Show a CLI command and its output.',
  schema: z.object({
    variant: surface,
    heading: short(80).optional(),
    command: short(160).optional(),
    output: long(700).optional(),
  }),
};
const diff: SlideTemplate = {
  key: 'diff',
  name: 'Code diff',
  category: 'Show',
  whenToUse: 'A before/after code or text diff. Show exactly what changed.',
  schema: z.object({
    variant: surface,
    heading: short(80).optional(),
    before: long(600),
    after: long(600),
  }),
};
const financials: SlideTemplate = {
  key: 'financials',
  name: 'Financials',
  category: 'Show',
  whenToUse: 'A P&L or income statement. Revenue, cost, and margin lines.',
  schema: z.object({
    variant: surface,
    heading: short(80).optional(),
    rows: z
      .array(
        z.object({
          label: short(60),
          value: short(24),
          note: short(40).optional(),
        })
      )
      .min(1)
      .max(10),
  }),
};
const revenueBreakdown: SlideTemplate = {
  key: 'revenueBreakdown',
  name: 'Revenue breakdown',
  category: 'Show',
  whenToUse: 'Revenue split by segment, product, or region.',
  schema: z.object({
    variant: surface,
    heading: short(80).optional(),
    segments: z
      .array(
        z.object({
          label: short(40),
          value: short(24),
          percent: z.number().optional(),
        })
      )
      .min(1)
      .max(8),
  }),
};
const unitEconomics: SlideTemplate = {
  key: 'unitEconomics',
  name: 'Unit economics',
  category: 'Show',
  whenToUse: 'CAC, LTV, payback, and margins. Prove the model works per unit.',
  schema: z.object({
    variant: surface,
    heading: short(80).optional(),
    metrics: z
      .array(z.object({ label: short(40), value: short(24) }))
      .min(2)
      .max(6),
  }),
};
const marketSizing: SlideTemplate = {
  key: 'marketSizing',
  name: 'Market sizing',
  category: 'Show',
  whenToUse: 'TAM, SAM, SOM. Use to size the market opportunity.',
  schema: z.object({
    variant: surface,
    heading: short(80).optional(),
    tam: short(40),
    sam: short(40),
    som: short(40),
    note: long(160).optional(),
  }),
};
const npsScore: SlideTemplate = {
  key: 'npsScore',
  name: 'NPS score',
  category: 'Show',
  whenToUse: 'NPS or a satisfaction score with breakdown.',
  schema: z.object({
    variant: surface,
    score: short(12),
    promoters: short(12).optional(),
    passives: short(12).optional(),
    detractors: short(12).optional(),
    note: long(120).optional(),
  }),
};
const benchmark: SlideTemplate = {
  key: 'benchmark',
  name: 'Benchmark',
  category: 'Show',
  whenToUse: 'Your number against competitors or a baseline.',
  schema: z.object({
    variant: surface,
    heading: short(80).optional(),
    items: z
      .array(z.object({ label: short(40), value: z.number() }))
      .min(2)
      .max(8),
    highlight: short(40).optional(),
    unit: short(12).optional(),
  }),
};

/** 首批全部模板（注册表数据源）。 */
export const SLIDE_TEMPLATES: SlideTemplate[] = [
  roadmap,
  services,
  pricing,
  team,
  logos,
  techStack,
  integrations,
  productShowcase,
  releaseNotes,
  codeBlock,
  terminal,
  diff,
  financials,
  revenueBreakdown,
  unitEconomics,
  marketSizing,
  npsScore,
  benchmark,
  exercise,
  quadrant,
  comparisonMatrix,
  recipe,
  phaseStrip,
  riskRegister,
  quiz,
  reflection,
  statusUpdate,
  okr,
  decisionMatrix,
  raci,
  socialProof,
  learningObjectives,
  author,
  toc,
  anecdote,
  manifesto,
  dropCap,
  calloutCard,
  beforeAfter,
  testimonial,
  faq,
  checklist,
  valueProp,
  principle,
  actionItems,
  proConCard,
  mythVsReality,
  pullQuoteWall,
  quoteGrid,
  resources,
  thanksClose,
  offerStack,
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
