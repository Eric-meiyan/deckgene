import { renderSlide } from './slides';

export interface RenderSlide {
  id: string;
  slide_type: string;
  content: Record<string, unknown>;
}

/**
 * 把一份 deck 的有序 slides 渲染为可滚动的网页演示稿（live URL 页面用）。
 * 白标：默认无 deckgene 水印。
 */
export function DeckRenderer({ slides }: { slides: RenderSlide[] }) {
  return (
    <div className="dot-grid bg-background min-h-screen w-full py-10">
      <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4">
        {slides.map((s) => (
          <section key={s.id} className="fade-up">
            {renderSlide(s.slide_type, s.content)}
          </section>
        ))}
      </div>
    </div>
  );
}
