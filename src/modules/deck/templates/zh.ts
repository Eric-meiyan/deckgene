/**
 * 89 个 slide_type 的中文译名 + 说明（registry 里 name/whenToUse 为英文）。
 * 客户端按 locale 切换显示；缺失则回退英文。
 */
export const SLIDE_ZH: Record<string, { name: string; when: string }> = {
  title: { name: '封面', when: '开场封面：标题、面向谁、日期。永远是第一页。' },
  agenda: {
    name: '议程',
    when: '本次要讲什么，简短有序列表。用于较长 deck 开头。',
  },
  statement: {
    name: '主张',
    when: '一句有力论点，无多余装饰。重重落下一个观点。',
  },
  chapter: { name: '章节分隔', when: '章节之间的分隔页，标示新部分开始。' },
  compare: { name: '对比', when: '两者并排（A vs B）。用于正好两项的对决。' },
  process: { name: '流程步骤', when: '有序步骤或可复用方法。顺序重要时用。' },
  bullets: { name: '要点清单', when: '一组要点或待办。用于要求、要点、清单。' },
  swot: { name: 'SWOT', when: '优势、劣势、机会、威胁。用于战略态势分析。' },
  caseStudy: { name: '案例', when: '客户故事：问题、方案、结果。用名字举证。' },
  stats: { name: '数据行', when: '三四个等权重指标。用于一组相关数字。' },
  bigNumber: {
    name: '大数字',
    when: '一个超大数字/词 + 短标签。一个数字撑全页时用。',
  },
  kpi: { name: 'KPI 看板', when: '多个 KPI 带变化与趋势。进展证明看板。' },
  chart: { name: '图表', when: '数据可视化（折线/柱/面积）。揭示趋势或对比。' },
  image: { name: '图片', when: '满幅图片配少量文字。营造氛围或调节节奏。' },
  imageText: {
    name: '图文左右',
    when: '一侧大图、另一侧标题配正文或要点。图片可切左右。用于图文并排讲解。',
  },
  html: {
    name: '自定义 HTML',
    when: '粘贴一段 HTML/CSS，整页按源码渲染（沙箱隔离，不跑脚本）。用于内置页型覆盖不了的自定义版式或嵌入内容。',
  },
  imageGrid: {
    name: '多图并排',
    when: '两到四张图并排（左中右），每张可配一行说明。用于一组视觉并列展示。',
  },
  timeline: {
    name: '时间线',
    when: '沿时间轴的事件。历史、日期序列、过往业绩。',
  },
  dataTable: { name: '数据表', when: '真实行列表格。需要精确表格数据时用。' },
  cta: { name: '行动召唤', when: '一个清晰的下一步及如何执行。用行动收尾。' },
  contactCard: {
    name: '联系卡',
    when: '如何联系你：姓名、邮箱、链接。收尾页附近。',
  },
  author: { name: '作者', when: '介绍讲者：姓名、角色、一句可信背书。' },
  toc: { name: '目录', when: '编号目录，列出各章节。用于较长结构化 deck。' },
  anecdote: { name: '轶事', when: '用一个小故事开场，引出问题。' },
  manifesto: { name: '宣言', when: '大胆的信念宣告。用于愿景、使命或号召。' },
  dropCap: { name: '首字下沉', when: '带超大首字母的社论式开场段落。' },
  calloutCard: {
    name: '提示卡',
    when: '一条高亮的注意/警告/要点。标出别错过的东西。',
  },
  beforeAfter: { name: '前后对比', when: '起始态与结束态。展示转变或影响。' },
  testimonial: { name: '客户证言', when: '一条带署名的客户引言。' },
  faq: { name: '常见问题', when: '常见问题与简短回答。预先回应异议。' },
  checklist: {
    name: '检查清单',
    when: '待勾选项。用于要求、就绪度或待办清单。',
  },
  valueProp: { name: '价值主张', when: '核心价值主张及面向谁。' },
  principle: { name: '原则', when: '阐述并解释一条指导原则。' },
  actionItems: { name: '行动项', when: '带负责人与截止日期的下一步。' },
  proConCard: { name: '利弊卡', when: '一边利、一边弊。诚实权衡某选项。' },
  mythVsReality: {
    name: '误区 vs 真相',
    when: '一个误解配上事实，纠正常见错误认知。',
  },
  pullQuoteWall: { name: '引言墙', when: '多条短引言排在一起。众声合鸣。' },
  quoteGrid: { name: '引言网格', when: '多条引言的网格。同时展示多条证言。' },
  resources: {
    name: '资源',
    when: '深入了解的链接与参考。结尾的阅读/工具清单。',
  },
  thanksClose: { name: '致谢收尾', when: '温暖的结束致谢。用作最后一页。' },
  offerStack: { name: '报价组合', when: '套餐构成与价值对比价格。论证报价。' },
  exercise: { name: '练习', when: '给观众的动手任务。用于工作坊与培训。' },
  quadrant: { name: '2×2 象限', when: '在两个维度上定位项目的 2x2 矩阵。' },
  comparisonMatrix: {
    name: '对比矩阵',
    when: '多个选项按多项标准打分。功能/供应商对比。',
  },
  recipe: { name: '配方', when: '原料加方法。带输入和步骤的 how-to。' },
  phaseStrip: { name: '阶段条', when: '几个阶段排成横条。轻量高层计划。' },
  riskRegister: {
    name: '风险登记',
    when: '风险及其可能性、影响、缓解。风险治理评审。',
  },
  quiz: { name: '测验题', when: '一个问题配选项。教学时检验理解。' },
  reflection: { name: '反思提示', when: '一个反思性提问。停下来让人思考。' },
  statusUpdate: { name: '状态更新', when: '各工作流的进展。例行更新或站会。' },
  okr: { name: 'OKR', when: '目标与可衡量的关键结果。设定或回顾目标。' },
  decisionMatrix: {
    name: '决策矩阵',
    when: '选项加权打分并给出胜出者。论证选择。',
  },
  raci: { name: 'RACI 矩阵', when: '负责、批准、咨询、知会。分配工作角色。' },
  socialProof: {
    name: '社会证明',
    when: 'logo、引言与数字叠加。快速建立可信度。',
  },
  learningObjectives: {
    name: '学习目标',
    when: '学完后能做到什么。开启课程或工作坊。',
  },
  roadmap: { name: '路线图', when: '沿路径的带日期里程碑。何时交付什么。' },
  services: {
    name: '服务网格',
    when: '一组服务或能力卡片。铺陈你能提供什么。',
  },
  pricing: { name: '定价', when: '定价档位及功能与价格。用于定价页。' },
  team: { name: '团队', when: '团队成员，含照片、姓名、角色。' },
  logos: { name: '客户 logo', when: '一面客户或合作伙伴 logo 墙。' },
  techStack: { name: '技术栈', when: '在用的技术，分组展示。' },
  integrations: { name: '集成', when: '产品能连接什么。展示集成生态。' },
  productShowcase: { name: '产品展示', when: '产品截图配说明。' },
  releaseNotes: {
    name: '发布说明',
    when: '某次发布上线了什么。用于更新日志。',
  },
  codeBlock: {
    name: '代码块',
    when: '带语法的真实代码片段。面向开发者的内容。',
  },
  terminal: { name: '终端', when: '命令行会话。展示一条命令及其输出。' },
  diff: { name: '代码 diff', when: '前后代码或文本差异。展示到底改了什么。' },
  financials: { name: '财务', when: '损益表。收入、成本、利润各行。' },
  revenueBreakdown: { name: '收入构成', when: '按板块、产品或地区拆分收入。' },
  unitEconomics: {
    name: '单位经济',
    when: 'CAC、LTV、回收期与毛利。证明单位模型成立。',
  },
  marketSizing: { name: '市场规模', when: 'TAM、SAM、SOM。测算市场机会。' },
  npsScore: { name: 'NPS 分数', when: 'NPS 或满意度分数及构成。' },
  benchmark: { name: '对标', when: '你的数字对比竞品或基线。' },
  embed: { name: '嵌入', when: '嵌入的视频、demo 或实时元素。' },
  storyboard: { name: '故事板', when: '跨几格的叙事。走一遍场景或用户故事。' },
  funnel: { name: '漏斗', when: '自上而下收窄的各阶段。转化、管道或流失。' },
  gauge: { name: '仪表', when: '单个数值对照目标或区间。' },
  customerJourney: {
    name: '客户旅程',
    when: '用户跨阶段的路径及感受。旅程地图。',
  },
  waterfall: { name: '瀑布图', when: '通过增减在两个总数之间架桥。' },
  metricDashboard: { name: '指标仪表盘', when: '多个指标连同状态与趋势。' },
  trafficLight: { name: '红绿灯', when: '各工作流的红/黄/绿。RAG 状态更新。' },
  gantt: { name: '甘特图', when: '任务跨时间及时长。排期项目计划。' },
  kanban: { name: '看板', when: '工作项按阶段分列。' },
  milestonePlan: { name: '里程碑计划', when: '关键里程碑及目标日期。' },
  dependencyMap: {
    name: '依赖图',
    when: '谁依赖/阻塞谁。展示关键路径与阻塞。',
  },
  businessModelCanvas: { name: '商业模式画布', when: '商业模式九宫格。' },
  orgChart: { name: '组织架构', when: '汇报线与团队结构。' },
  salesPipeline: { name: '销售管道', when: '各阶段的交易及金额。' },
  channelMix: { name: '渠道构成', when: '触达或花费在各渠道的分配。' },
  techRadar: { name: '技术雷达', when: '技术评级 adopt/trial/hold。' },
  architecture: { name: '架构图', when: '系统或组件图。解释某物如何构建。' },
  userFlow: { name: '用户流程', when: '用户在产品中经过的步骤。' },
};

export function slideName(key: string, fallback: string, zh: boolean): string {
  return zh ? (SLIDE_ZH[key]?.name ?? fallback) : fallback;
}
export function slideWhen(key: string, fallback: string, zh: boolean): string {
  return zh ? (SLIDE_ZH[key]?.when ?? fallback) : fallback;
}
