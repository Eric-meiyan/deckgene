import { useEffect, useMemo, useRef, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';

import { listSlideTemplates } from '@/modules/deck/templates/registry';
import type { SlideTemplate } from '@/modules/deck/templates/types';
import { slideName, slideWhen } from '@/modules/deck/templates/zh';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { sampleSlideContent } from '@/components/deck/slide-form';
import { renderSlide } from '@/components/deck/slides';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

const CATEGORIES = ['Open', 'Argue', 'Show', 'Close'] as const;
const CAT_LABEL: Record<string, [string, string]> = {
  Open: ['开场', 'Open'],
  Argue: ['论证', 'Argue'],
  Show: ['展示', 'Show'],
  Close: ['收尾', 'Close'],
};

// slide 内部字号/间距是为全屏(≈1280px)设计的固定 px。库页要等比缩放，
// 否则塞进小格子里会比例失调 + 被裁切。做法：按设计宽度渲染，再 transform 缩放。
const DESIGN_W = 1280;

/** 把一张 slide 按设计宽度渲染后等比缩放填满容器（保持 16:9，字迹清晰）。 */
function ScaledPreview({
  slideKey,
  content,
}: {
  slideKey: string;
  content: Record<string, unknown>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / DESIGN_W);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="relative w-full overflow-hidden"
      style={{ aspectRatio: '16 / 9' }}
    >
      <div
        className="absolute top-0 left-0"
        style={{
          width: DESIGN_W,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        {renderSlide(slideKey, content)}
      </div>
    </div>
  );
}

function LibraryPage() {
  const [q, setQ] = useState('');
  const [preview, setPreview] = useState<SlideTemplate | null>(null);
  const zh = getLocale() === 'zh';
  const all = listSlideTemplates();

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return all;
    return all.filter(
      (t) =>
        t.key.toLowerCase().includes(s) ||
        t.name.toLowerCase().includes(s) ||
        t.whenToUse.toLowerCase().includes(s) ||
        slideName(t.key, t.name, true).toLowerCase().includes(s) ||
        slideWhen(t.key, t.whenToUse, true).toLowerCase().includes(s)
    );
  }, [q, all]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">{m['settings.library.title']()}</h1>
        <p className="text-muted-foreground text-sm">
          {m['settings.library.subtitle']()} · {all.length}
        </p>
      </div>

      <Input
        className="max-w-md"
        placeholder={m['settings.library.search']()}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {CATEGORIES.map((cat) => {
        const items = filtered.filter((t) => t.category === cat);
        if (!items.length) return null;
        return (
          <section key={cat} className="space-y-3">
            <h2 className="text-lg font-semibold">
              {zh ? CAT_LABEL[cat][0] : CAT_LABEL[cat][1]}
              <span className="text-muted-foreground ml-2 text-sm font-normal">
                {items.length}
              </span>
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              {items.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setPreview(t)}
                  className="group space-y-2 text-left"
                  title={m['settings.library.click_to_zoom']()}
                >
                  <div className="ring-border group-hover:ring-primary cursor-zoom-in overflow-hidden rounded-xl ring-1 transition group-hover:ring-2">
                    <ScaledPreview
                      slideKey={t.key}
                      content={sampleSlideContent(t.key)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {slideName(t.key, t.name, zh)}
                    </span>
                    <Badge
                      variant="secondary"
                      className="font-mono text-[10px]"
                    >
                      {t.key}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {slideWhen(t.key, t.whenToUse, zh)}
                  </p>
                </button>
              ))}
            </div>
          </section>
        );
      })}

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="w-[94vw] max-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {preview && slideName(preview.key, preview.name, zh)}
              {preview && (
                <Badge variant="secondary" className="font-mono text-[10px]">
                  {preview.key}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-xl border">
                <ScaledPreview
                  slideKey={preview.key}
                  content={sampleSlideContent(preview.key)}
                />
              </div>
              <p className="text-muted-foreground text-sm">
                {slideWhen(preview.key, preview.whenToUse, zh)}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const Route = createFileRoute('/settings/library')({
  component: LibraryPage,
});
