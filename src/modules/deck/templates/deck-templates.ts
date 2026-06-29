/**
 * Deck 级模板（starters，见 docs/PRD.md §6.5）。
 * 每个模板 = 有序 slides + 合法占位 content（通过对应 slide_type 的 schema），
 * 一键创建后即可渲染、再逐页填充。
 */

export interface DeckTemplateSlide {
  slideType: string;
  content: Record<string, unknown>;
}
export interface DeckTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  slides: DeckTemplateSlide[];
}

const P = '（点此编辑）'; // 占位提示

export const DECK_TEMPLATES: DeckTemplate[] = [
  {
    id: 'pitch',
    name: '融资路演 Pitch Deck',
    description: '面向投资人:问题→方案→市场→数据→团队→融资。',
    category: 'Business',
    slides: [
      {
        slideType: 'title',
        content: {
          variant: 'dark',
          title: '公司 / 产品名',
          subtitle: '一句话定位',
          eyebrow: 'Seed 轮',
        },
      },
      {
        slideType: 'statement',
        content: {
          variant: 'accent',
          eyebrow: '问题',
          statement: `我们要解决的问题：${P}`,
        },
      },
      {
        slideType: 'statement',
        content: { eyebrow: '解决方案', statement: `我们的方案：${P}` },
      },
      {
        slideType: 'bigNumber',
        content: {
          variant: 'subtle',
          value: 'TAM',
          label: '市场规模',
          body: P,
        },
      },
      {
        slideType: 'stats',
        content: {
          heading: '关键指标',
          stats: [
            { value: '0', label: '用户' },
            { value: '0', label: '收入' },
            { value: '0%', label: '增长' },
          ],
        },
      },
      {
        slideType: 'compare',
        content: {
          heading: '我们 vs 现状',
          left: { label: '现状', body: P },
          right: { label: '我们', body: P },
        },
      },
      {
        slideType: 'bullets',
        content: {
          heading: '团队',
          items: [{ text: '创始人 — 背景' }, { text: '联合创始人 — 背景' }],
        },
      },
      {
        slideType: 'cta',
        content: {
          variant: 'accent',
          heading: '本轮融资',
          body: `用途与金额：${P}`,
          buttonLabel: '联系我们',
        },
      },
    ],
  },
  {
    id: 'product',
    name: '产品发布 Product Launch',
    description: '介绍新产品:定位→能力→对比→行动。',
    category: 'Product',
    slides: [
      {
        slideType: 'title',
        content: {
          variant: 'accent',
          title: '产品名',
          subtitle: '核心价值主张',
        },
      },
      {
        slideType: 'statement',
        content: { eyebrow: '为什么', statement: `用户的痛点：${P}` },
      },
      {
        slideType: 'bullets',
        content: {
          heading: '核心能力',
          items: [
            { text: '能力一', detail: P },
            { text: '能力二', detail: P },
            { text: '能力三', detail: P },
          ],
        },
      },
      {
        slideType: 'compare',
        content: {
          heading: '用前 vs 用后',
          left: { label: '用前', body: P },
          right: { label: '用后', body: P },
        },
      },
      {
        slideType: 'stats',
        content: {
          heading: '成效',
          stats: [
            { value: '0%', label: '提升' },
            { value: '0', label: '节省' },
          ],
        },
      },
      {
        slideType: 'cta',
        content: {
          variant: 'accent',
          heading: '立即开始',
          buttonLabel: '马上体验',
        },
      },
    ],
  },
  {
    id: 'qbr',
    name: '季度复盘 QBR',
    description: '团队季度回顾:议程→KPI→成绩→风险→下一步。',
    category: 'Internal',
    slides: [
      {
        slideType: 'title',
        content: { variant: 'dark', title: 'Q_ 季度复盘', date: '2026 Q_' },
      },
      {
        slideType: 'agenda',
        content: {
          heading: '议程',
          items: [
            { label: 'KPI 概览' },
            { label: '关键成绩' },
            { label: '风险' },
            { label: '下一步' },
          ],
        },
      },
      {
        slideType: 'kpi',
        content: {
          heading: 'KPI',
          kpis: [
            { label: '收入', value: '0', trend: 'up' },
            { label: '用户', value: '0', trend: 'up' },
            { label: '留存', value: '0%', trend: 'flat' },
          ],
        },
      },
      {
        slideType: 'bullets',
        content: {
          heading: '关键成绩',
          items: [{ text: '成绩一' }, { text: '成绩二' }],
        },
      },
      {
        slideType: 'bullets',
        content: {
          heading: '风险与挑战',
          items: [{ text: '风险一' }, { text: '风险二' }],
        },
      },
      { slideType: 'cta', content: { heading: '下一步重点', body: P } },
    ],
  },
  {
    id: 'research',
    name: '研究简报 Research Brief',
    description: '研究汇报:问题→方法→发现→结论。',
    category: 'Research',
    slides: [
      {
        slideType: 'title',
        content: { title: '研究主题', subtitle: '研究简报' },
      },
      {
        slideType: 'statement',
        content: { eyebrow: '研究问题', statement: P },
      },
      {
        slideType: 'process',
        content: {
          heading: '研究方法',
          steps: [
            { title: '步骤一', detail: P },
            { title: '步骤二', detail: P },
          ],
        },
      },
      {
        slideType: 'stats',
        content: {
          heading: '主要发现',
          stats: [
            { value: '0', label: '发现一' },
            { value: '0', label: '发现二' },
          ],
        },
      },
      {
        slideType: 'statement',
        content: { variant: 'subtle', eyebrow: '结论', statement: P },
      },
      { slideType: 'contactCard', content: { heading: '联系', name: '作者' } },
    ],
  },
  {
    id: 'lesson',
    name: '课程讲义 Course Lesson',
    description: '教学课件:目标→大纲→步骤→小结。',
    category: 'Education',
    slides: [
      {
        slideType: 'title',
        content: { variant: 'accent', title: '课程标题', subtitle: '本节主题' },
      },
      {
        slideType: 'bullets',
        content: {
          heading: '学习目标',
          items: [{ text: '学完能做到一' }, { text: '学完能做到二' }],
        },
      },
      {
        slideType: 'agenda',
        content: {
          heading: '本节大纲',
          items: [
            { label: '部分一' },
            { label: '部分二' },
            { label: '部分三' },
          ],
        },
      },
      {
        slideType: 'process',
        content: {
          heading: '操作步骤',
          steps: [
            { title: '第一步', detail: P },
            { title: '第二步', detail: P },
          ],
        },
      },
      {
        slideType: 'statement',
        content: { variant: 'subtle', eyebrow: '小结', statement: P },
      },
      { slideType: 'cta', content: { heading: '课后练习', body: P } },
    ],
  },
];

export function listDeckTemplates(): DeckTemplate[] {
  return DECK_TEMPLATES;
}
export function getDeckTemplate(id: string): DeckTemplate | undefined {
  return DECK_TEMPLATES.find((t) => t.id === id);
}
