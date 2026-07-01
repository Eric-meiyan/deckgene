import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Grid2x2, Maximize, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { renderSlide } from '@/components/deck/slides';

export interface PlayerSlide {
  id?: string;
  slide_type: string;
  content: Record<string, unknown>;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

/**
 * 全屏演示播放器（纯幻灯片）。所有者(/present)与公开页(/d 的"演示")共用。
 * 数据由调用方传入；自身不取数据，故公开页无需鉴权即可演示。
 */
export function DeckPlayer({
  title,
  slides,
  style,
  onExit,
}: {
  title?: string;
  slides: PlayerSlide[];
  style?: React.CSSProperties;
  onExit: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  const [overview, setOverview] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const total = slides.length;

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else rootRef.current?.requestFullscreen?.();
  }, []);
  const next = useCallback(
    () => setI((v) => Math.min(total - 1, v + 1)),
    [total]
  );
  const prev = useCallback(() => setI((v) => Math.max(0, v - 1)), []);

  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    rootRef.current?.requestFullscreen?.().catch(() => {});
  }, []);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        next();
      } else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'g' || e.key === 'G') setOverview((o) => !o);
      else if (e.key === 'f' || e.key === 'F') toggleFullscreen();
      else if (e.key === 'Escape') {
        if (overview) setOverview(false);
        else if (document.fullscreenElement) document.exitFullscreen?.();
        else onExit();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, onExit, overview, toggleFullscreen]);

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-50 flex flex-col bg-black text-neutral-300"
    >
      <div className="flex items-center justify-between px-4 py-2 text-sm">
        <div className="flex items-center gap-3">
          {title && <span className="font-medium text-white">{title}</span>}
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
            onClick={onExit}
            className="text-neutral-400 hover:text-white"
            aria-label="exit"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {overview ? (
        <div
          className="deck-fonts grid flex-1 grid-cols-2 gap-4 overflow-auto p-6 sm:grid-cols-3 lg:grid-cols-4"
          style={style}
        >
          {slides.map((s, idx) => (
            <button
              key={s.id ?? idx}
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
        <div className="flex flex-1 items-center justify-center overflow-hidden px-4 pb-2">
          {/* 按可用高度反算最大宽度：16:9 幻灯片在保持比例下尽量填满屏幕，
              不再被 max-w-6xl 硬截断（否则宽屏上四周留大片黑边）。
              减去顶部信息栏 + 底部翻页栏 + 内边距（约 96px）。 */}
          <div
            className="deck-fonts w-full"
            style={{
              ...style,
              width: 'min(100%, calc((100vh - 96px) * 16 / 9))',
            }}
          >
            {slides[i] && renderSlide(slides[i].slide_type, slides[i].content)}
          </div>
        </div>
      )}

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
