import PptxModule from 'pptxgenjs';

import type { DeckWithSlides } from './deck.service';

// CJS/ESM 互操作：类可能在 .default 上
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PptxGenJS: any = (PptxModule as any).default ?? PptxModule;

/**
 * 导出（见 docs/PRD.md §9.9）。PPTX 用 pptxgenjs（纯 JS，Workers 可运行）：
 * 把每页 typed content 映射为 PPT 文本。PDF 走 Cloudflare Browser Rendering（另见 export-pdf）。
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toLines(slideType: string, c: any): { title: string; body: string[] } {
  const s = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : '');
  const arr = (v: unknown) => (Array.isArray(v) ? v : []);
  switch (slideType) {
    case 'title':
      return {
        title: s(c.title),
        body: [
          s(c.subtitle),
          s(c.eyebrow),
          [s(c.client), s(c.date)].filter(Boolean).join(' · '),
        ].filter(Boolean),
      };
    case 'statement':
      return {
        title: s(c.statement),
        body: [s(c.attribution)].filter(Boolean),
      };
    case 'chapter':
      return { title: s(c.title), body: [s(c.number)].filter(Boolean) };
    case 'agenda':
      return {
        title: s(c.heading),
        body: arr(c.items)
          .map((i: any) => s(i.label))
          .filter(Boolean),
      };
    case 'bullets':
      return {
        title: s(c.heading),
        body: arr(c.items)
          .map((i: any) => s(i.text) + (s(i.detail) ? ` — ${s(i.detail)}` : ''))
          .filter(Boolean),
      };
    case 'process':
      return {
        title: s(c.heading),
        body: arr(c.steps).map(
          (i: any, n: number) =>
            `${n + 1}. ${s(i.title)}${s(i.detail) ? ` — ${s(i.detail)}` : ''}`
        ),
      };
    case 'stats':
      return {
        title: s(c.heading),
        body: arr(c.stats).map((x: any) => `${s(x.value)} — ${s(x.label)}`),
      };
    case 'kpi':
      return {
        title: s(c.heading),
        body: arr(c.kpis).map(
          (x: any) =>
            `${s(x.label)}: ${s(x.value)}${s(x.delta) ? ` (${s(x.delta)})` : ''}`
        ),
      };
    case 'bigNumber':
      return {
        title: s(c.value),
        body: [s(c.label), s(c.body), s(c.source)].filter(Boolean),
      };
    case 'compare':
      return {
        title: s(c.heading),
        body: [
          `${s(c.left?.label)}: ${s(c.left?.body)}`,
          `${s(c.right?.label)}: ${s(c.right?.body)}`,
        ],
      };
    case 'swot':
      return {
        title: s(c.heading) || 'SWOT',
        body: [
          `Strengths: ${arr(c.strengths).join(', ')}`,
          `Weaknesses: ${arr(c.weaknesses).join(', ')}`,
          `Opportunities: ${arr(c.opportunities).join(', ')}`,
          `Threats: ${arr(c.threats).join(', ')}`,
        ],
      };
    case 'caseStudy':
      return {
        title: s(c.heading) || s(c.client),
        body: [
          `Problem: ${s(c.problem)}`,
          `Solution: ${s(c.solution)}`,
          `Result: ${s(c.result)}`,
        ],
      };
    case 'timeline':
      return {
        title: s(c.heading),
        body: arr(c.events).map((e: any) => `${s(e.date)} — ${s(e.title)}`),
      };
    case 'cta':
      return {
        title: s(c.heading),
        body: [s(c.body), s(c.buttonLabel)].filter(Boolean),
      };
    case 'contactCard':
      return {
        title: s(c.heading) || 'Contact',
        body: [
          s(c.name),
          s(c.email),
          ...arr(c.links).map((l: any) => `${s(l.label)}: ${s(l.url)}`),
        ].filter(Boolean),
      };
    default: {
      const body: string[] = [];
      for (const [k, v] of Object.entries(c)) {
        if (['variant', 'layoutVariant', 'image', 'imageUrl'].includes(k))
          continue;
        if (typeof v === 'string' && v.trim()) body.push(v.trim());
      }
      return { title: s(c.heading) || s(c.title), body };
    }
  }
}

export async function deckToPptx(deck: DeckWithSlides): Promise<ArrayBuffer> {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE'; // 16:9 (13.33 x 7.5 in)
  pptx.author = 'deckgene';
  pptx.title = deck.title;

  for (const sl of deck.slides) {
    const { title, body } = toLines(sl.slideType, sl.content ?? {});
    const slide = pptx.addSlide();
    let y = 0.5;
    if (title) {
      slide.addText(title, {
        x: 0.6,
        y,
        w: 12,
        h: 1.1,
        fontSize: 30,
        bold: true,
      });
      y += 1.3;
    }
    if (body.length) {
      slide.addText(
        body.map((t) => ({ text: t, options: { bullet: true } })),
        {
          x: 0.7,
          y,
          w: 12,
          h: 6.5 - y,
          fontSize: 18,
          valign: 'top',
          lineSpacingMultiple: 1.2,
        }
      );
    }
  }

  return (await pptx.write({ outputType: 'arraybuffer' })) as ArrayBuffer;
}
