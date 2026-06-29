import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight, Grid2x2, Maximize, X } from 'lucide-react';

import { useRouter } from '@/core/i18n/navigation';
import { apiGet } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { renderSlide } from '@/components/deck/slides';

interface SlideDTO {
  id: string;
  slide_type: string;
  content: Record<string, unknown>;
  notes?: string | null;
}
interface DeckDTO {
  id: string;
  title: string;
  brand_id: string | null;
  slides: SlideDTO[];
}
interface BrandDTO {
  id: string;
  palette: Record<string, string> | null;
}

function brandStyle(
  palette?: Record<string, string> | null
): React.CSSProperties {
  if (!palette) return {};
  const s: Record<string, string> = {};
  if (palette.primary) {
    s['--primary'] = palette.primary;
    s['--brand-to'] = palette.primary;
    s['--brand-from'] = palette.secondary || palette.accent || palette.primary;
  }
  if (palette.background) s['--background'] = palette.background;
  if (palette.text) s['--foreground'] = palette.text;
  return s as React.CSSProperties;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function PresentPage() {
  const { id } = Route.useParams();
  const router = useRouter();
  const [i, setI] = useState(0);
  const [overview, setOverview] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const deckQ = useQuery({
    queryKey: ['deck', id],
    queryFn: () => apiGet<DeckDTO>(`/api/decks/${id}`),
  });
  const brandsQ = useQuery({
    queryKey: ['brands'],
    queryFn: () => apiGet<BrandDTO[]>('/api/brands'),
  });

  const deck = deckQ.data;
  const slides = deck?.slides ?? [];
  const total = slides.length;
  const palette =
    brandsQ.data?.find((b) => b.id === deck?.brand_id)?.palette ?? null;

  const next = useCallback(
    () => setI((v) => Math.min(total - 1, v + 1)),
    [total]
  );
  const prev = useCallback(() => setI((v) => Math.max(0, v - 1)), []);
  const exit = useCallback(
    () => router.push(`/settings/decks/${id}`),
    [id, router]
  );

  // 计时器
  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // 键盘导航
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        next();
      } else if (e.key === 'ArrowLeft') {
        prev();
      } else if (e.key === 'g' || e.key === 'G') {
        setOverview((o) => !o);
      } else if (e.key === 'f' || e.key === 'F') {
        if (!document.fullscreenElement)
          document.documentElement.requestFullscreen?.();
        else document.exitFullscreen?.();
      } else if (e.key === 'Escape') {
        if (overview) setOverview(false);
        else if (document.fullscreenElement) document.exitFullscreen?.();
        else exit();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, exit, overview]);

  const style = brandStyle(palette);

  return (
    <div
      className="bg-background fixed inset-0 z-50 flex flex-col"
      style={style}
    >
      {/* 顶栏 */}
      <div className="flex items-center justify-between px-4 py-2 text-sm">
        <div className="flex items-center gap-3">
          <span className="font-medium">{deck?.title ?? '…'}</span>
          <span className="text-muted-foreground">
            {pad(i + 1)} / {pad(total || 1)}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground tabular-nums">
            {pad(Math.floor(elapsed / 60))}:{pad(elapsed % 60)}
          </span>
          <button
            onClick={() => setOverview((o) => !o)}
            className="text-muted-foreground hover:text-foreground"
            aria-label="overview"
          >
            <Grid2x2 className="size-4" />
          </button>
          <button
            onClick={() =>
              document.fullscreenElement
                ? document.exitFullscreen?.()
                : document.documentElement.requestFullscreen?.()
            }
            className="text-muted-foreground hover:text-foreground"
            aria-label="fullscreen"
          >
            <Maximize className="size-4" />
          </button>
          <button
            onClick={exit}
            className="text-muted-foreground hover:text-foreground"
            aria-label="exit"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* 主体 */}
      {overview ? (
        <div className="grid flex-1 grid-cols-2 gap-4 overflow-auto p-6 sm:grid-cols-3 lg:grid-cols-4">
          {slides.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => {
                setI(idx);
                setOverview(false);
              }}
              className={cn(
                'overflow-hidden rounded-lg border text-left transition',
                idx === i ? 'ring-primary ring-2' : 'hover:border-primary/40'
              )}
            >
              <div className="pointer-events-none origin-top-left">
                {renderSlide(s.slide_type, s.content)}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-1 gap-4 overflow-hidden px-4 pb-4">
          {/* 当前页 */}
          <div className="dot-grid flex flex-1 items-center justify-center rounded-xl">
            <div className="w-full max-w-5xl">
              {slides[i] &&
                renderSlide(slides[i].slide_type, slides[i].content)}
            </div>
          </div>
          {/* 备注 + 下一页 */}
          <div className="hidden w-72 shrink-0 flex-col gap-4 overflow-auto lg:flex">
            <div>
              <div className="text-muted-foreground mb-1 text-xs font-semibold uppercase">
                {m['settings.present.notes']()}
              </div>
              <p className="text-sm">
                {slides[i]?.notes || (
                  <span className="text-muted-foreground">
                    {m['settings.present.no_notes']()}
                  </span>
                )}
              </p>
            </div>
            {slides[i + 1] && (
              <div>
                <div className="text-muted-foreground mb-1 text-xs font-semibold uppercase">
                  {m['settings.present.next']()}
                </div>
                <div className="pointer-events-none overflow-hidden rounded-lg border">
                  {renderSlide(slides[i + 1].slide_type, slides[i + 1].content)}
                </div>
              </div>
            )}
            <p className="text-muted-foreground mt-auto text-xs">
              {m['settings.present.hints']()}
            </p>
          </div>
        </div>
      )}

      {/* 底部翻页 */}
      {!overview && (
        <div className="flex items-center justify-center gap-3 py-3">
          <button
            onClick={prev}
            disabled={i === 0}
            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <ChevronLeft className="size-5" />
          </button>
          <span className="text-muted-foreground text-sm tabular-nums">
            {i + 1} / {total || 1}
          </span>
          <button
            onClick={next}
            disabled={i >= total - 1}
            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute('/present/$id')({
  component: PresentPage,
});
