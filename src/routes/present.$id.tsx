import { useCallback, useEffect, useRef, useState } from 'react';
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
  const rootRef = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  const [overview, setOverview] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else rootRef.current?.requestFullscreen?.();
  }, []);

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

  // 进入时尝试自动全屏（部分浏览器需用户手势，失败则静默）
  useEffect(() => {
    rootRef.current?.requestFullscreen?.().catch(() => {});
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
        toggleFullscreen();
      } else if (e.key === 'Escape') {
        if (overview) setOverview(false);
        else if (document.fullscreenElement) document.exitFullscreen?.();
        else exit();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, exit, overview, toggleFullscreen]);

  const style = brandStyle(palette);

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-50 flex flex-col bg-black text-neutral-300"
    >
      {/* 顶栏 */}
      <div className="flex items-center justify-between px-4 py-2 text-sm">
        <div className="flex items-center gap-3">
          <span className="font-medium text-white">{deck?.title ?? '…'}</span>
          <span className="text-neutral-500">
            {pad(i + 1)} / {pad(total || 1)}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-neutral-500 tabular-nums">
            {pad(Math.floor(elapsed / 60))}:{pad(elapsed % 60)}
          </span>
          <button
            onClick={() => setOverview((o) => !o)}
            className="text-neutral-400 hover:text-white"
            aria-label="overview"
          >
            <Grid2x2 className="size-4" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="text-neutral-400 hover:text-white"
            aria-label="fullscreen"
          >
            <Maximize className="size-4" />
          </button>
          <button
            onClick={exit}
            className="text-neutral-400 hover:text-white"
            aria-label="exit"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* 主体 */}
      {overview ? (
        <div
          className="grid flex-1 grid-cols-2 gap-4 overflow-auto p-6 sm:grid-cols-3 lg:grid-cols-4"
          style={style}
        >
          {slides.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => {
                setI(idx);
                setOverview(false);
              }}
              className={cn(
                'overflow-hidden rounded-lg border border-neutral-800 text-left transition',
                idx === i ? 'ring-primary ring-2' : 'hover:border-neutral-600'
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
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-5xl" style={style}>
              {slides[i] &&
                renderSlide(slides[i].slide_type, slides[i].content)}
            </div>
          </div>
          {/* 备注 + 下一页 */}
          <div className="hidden w-72 shrink-0 flex-col gap-4 overflow-auto lg:flex">
            <div>
              <div className="mb-1 text-xs font-semibold text-neutral-500 uppercase">
                {m['settings.present.notes']()}
              </div>
              <p className="text-sm text-neutral-200">
                {slides[i]?.notes || (
                  <span className="text-neutral-500">
                    {m['settings.present.no_notes']()}
                  </span>
                )}
              </p>
            </div>
            {slides[i + 1] && (
              <div>
                <div className="mb-1 text-xs font-semibold text-neutral-500 uppercase">
                  {m['settings.present.next']()}
                </div>
                <div
                  className="pointer-events-none overflow-hidden rounded-lg border border-neutral-800"
                  style={style}
                >
                  {renderSlide(slides[i + 1].slide_type, slides[i + 1].content)}
                </div>
              </div>
            )}
            <p className="mt-auto text-xs text-neutral-500">
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
            className="text-neutral-400 hover:text-white disabled:opacity-30"
          >
            <ChevronLeft className="size-5" />
          </button>
          <span className="text-sm text-neutral-500 tabular-nums">
            {i + 1} / {total || 1}
          </span>
          <button
            onClick={next}
            disabled={i >= total - 1}
            className="text-neutral-400 hover:text-white disabled:opacity-30"
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
