import { renderSlide } from './slides';

export interface RenderSlide {
  id: string;
  slide_type: string;
  content: Record<string, unknown>;
}

export interface RenderBrand {
  palette: Record<string, string> | null;
  typography: Record<string, string> | null;
}

/**
 * 把品牌 palette 注入为 CSS 变量，覆盖默认青绿主题（白标换肤）。
 * 仅注入存在的键；未提供则用 deckgene 默认主题。
 */
function brandStyle(brand?: RenderBrand | null): React.CSSProperties {
  const p = brand?.palette ?? {};
  const t = brand?.typography ?? {};
  const style: Record<string, string> = {};
  if (p.primary) {
    style['--primary'] = p.primary;
    style['--brand-to'] = p.primary;
    style['--brand-from'] = p.secondary || p.accent || p.primary;
  }
  if (p.background) style['--background'] = p.background;
  if (p.text) style['--foreground'] = p.text;
  if (t.body_font) style['--body-font'] = t.body_font;
  if (t.heading_font) style['--heading-font'] = t.heading_font;
  return style as React.CSSProperties;
}

/**
 * 把一份 deck 的有序 slides 渲染为可滚动的网页演示稿（live URL 页面用）。
 * 白标：默认无 deckgene 水印；brand 提供时按其 palette 换肤。
 */
export function DeckRenderer({
  slides,
  brand,
}: {
  slides: RenderSlide[];
  brand?: RenderBrand | null;
}) {
  return (
    <div
      className="dot-grid deck-fonts bg-background min-h-screen w-full py-10"
      style={brandStyle(brand)}
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4">
        {slides.map((s) => (
          <section key={s.id} className="fade-up break-after-page">
            {renderSlide(s.slide_type, s.content)}
          </section>
        ))}
      </div>
    </div>
  );
}
