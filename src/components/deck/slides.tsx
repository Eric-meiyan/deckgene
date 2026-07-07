import { createContext, useContext } from 'react';

import { cn } from '@/lib/utils';

/**
 * 通用版式微调（每页可选）：indent=内容整块左缩进(px)，fontScale=整页缩放(%)。
 * 由 renderSlide 从 content 读出并经 context 传给公共 Surface，避免改每个页型组件。
 */
const SlideLayout = createContext<{ indent?: number; fontScale?: number }>({});

/**
 * Slide 渲染组件（P1）。每个 slide_type 一个组件，消费 content + playful 主题。
 * content 来自 typed schema，但渲染处防御性读取（未知字段忽略）。
 * 样式开关：variant → 表面色调。brand token 注入留待 brand 模块。
 */

type Content = Record<string, any>;

function surfaceClass(variant?: string): string {
  switch (variant) {
    case 'dark':
      return 'bg-neutral-900 text-white';
    case 'accent':
      return 'brand-gradient text-white';
    case 'subtle':
      return 'bg-muted text-foreground';
    default:
      return 'bg-card text-foreground';
  }
}

function eyebrowClass(variant?: string): string {
  return variant === 'dark' || variant === 'accent'
    ? 'text-white/70'
    : 'text-primary';
}

function mutedClass(variant?: string): string {
  return variant === 'dark' || variant === 'accent'
    ? 'text-white/70'
    : 'text-muted-foreground';
}

function Surface({
  variant,
  children,
  className,
}: {
  variant?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { indent, fontScale } = useContext(SlideLayout);
  return (
    <div
      className={cn(
        'border-border/40 relative aspect-[16/9] w-full overflow-hidden rounded-[28px] border shadow-sm',
        surfaceClass(variant)
      )}
    >
      {/* 品牌 Logo（每页右下，--brand-logo 未设置则不显示）
          尺寸框在原 h-7/w-28 基础上放大到 200%（logo 偏小） */}
      <div
        className="absolute right-6 bottom-6 h-14 w-56 bg-contain bg-right-bottom bg-no-repeat"
        style={{ backgroundImage: 'var(--brand-logo, none)' }}
      />
      {/*
       * 内容层：撑满盒子，承载页型布局(className)与可选微调(zoom/indent)。
       * 页型的 flex 子项直接落在这一层，因此 flex-row(左图右字)、p-0(全出血图)
       * 等布局不会被额外包裹层破坏——微调只改这层的 style，不再改变 DOM 结构。
       */}
      <div
        className={cn(
          'flex size-full flex-col justify-center p-10 sm:p-14',
          className
        )}
        style={
          {
            zoom: fontScale != null ? fontScale / 100 : undefined,
            paddingLeft: indent != null ? `${indent}px` : undefined,
          } as React.CSSProperties
        }
      >
        {children}
      </div>
    </div>
  );
}

function Eyebrow({ variant, children }: { variant?: string; children?: any }) {
  if (!children) return null;
  return (
    <p
      className={cn(
        'mb-3 text-xs font-semibold tracking-[0.2em] uppercase',
        eyebrowClass(variant)
      )}
    >
      {children}
    </p>
  );
}

// ─── 各 slide_type 渲染 ──────────────────────────────────────────────

function TitleSlide({ c }: { c: Content }) {
  return (
    <Surface variant={c.variant}>
      <Eyebrow variant={c.variant}>{c.eyebrow}</Eyebrow>
      <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
        {c.title}
      </h1>
      {c.subtitle && (
        <p
          className={cn(
            'mt-4 max-w-4xl text-lg sm:text-xl',
            mutedClass(c.variant)
          )}
        >
          {c.subtitle}
        </p>
      )}
      {(c.client || c.date) && (
        <p className={cn('mt-8 text-sm', mutedClass(c.variant))}>
          {[c.client, c.date].filter(Boolean).join(' · ')}
        </p>
      )}
    </Surface>
  );
}

function AgendaSlide({ c }: { c: Content }) {
  const items: Content[] = c.items ?? [];
  return (
    <Surface variant={c.variant}>
      <Eyebrow variant={c.variant}>{c.eyebrow}</Eyebrow>
      <h2 className="mb-6 text-3xl font-bold sm:text-4xl">{c.heading}</h2>
      <ol className="space-y-3">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="bg-primary/15 text-primary inline-flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
              {i + 1}
            </span>
            <span>
              <span className="font-medium">{it.label}</span>
              {it.detail && (
                <span className={cn('block text-sm', mutedClass(c.variant))}>
                  {it.detail}
                </span>
              )}
            </span>
          </li>
        ))}
      </ol>
    </Surface>
  );
}

function StatementSlide({ c }: { c: Content }) {
  return (
    <Surface variant={c.variant} className="items-center text-center">
      <Eyebrow variant={c.variant}>{c.eyebrow}</Eyebrow>
      <p className="max-w-3xl text-3xl leading-snug font-semibold sm:text-4xl">
        {c.statement}
      </p>
      {c.attribution && (
        <p className={cn('mt-6 text-sm', mutedClass(c.variant))}>
          — {c.attribution}
        </p>
      )}
    </Surface>
  );
}

function ChapterSlide({ c }: { c: Content }) {
  return (
    <Surface variant={c.variant}>
      {c.number && (
        <span className="text-7xl font-black opacity-20 sm:text-8xl">
          {c.number}
        </span>
      )}
      <h2 className="mt-2 text-4xl font-bold sm:text-5xl">{c.title}</h2>
    </Surface>
  );
}

function BulletsSlide({ c }: { c: Content }) {
  const items: Content[] = c.items ?? [];
  return (
    <Surface variant={c.variant}>
      <h2 className="mb-6 text-3xl font-bold sm:text-4xl">{c.heading}</h2>
      <ul className="space-y-3">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="bg-primary mt-2 inline-block size-2 shrink-0 rounded-full" />
            <span>
              <span className="font-medium">{it.text}</span>
              {it.detail && (
                <span className={cn('block text-sm', mutedClass(c.variant))}>
                  {it.detail}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </Surface>
  );
}

function StatsSlide({ c }: { c: Content }) {
  const stats: Content[] = c.stats ?? [];
  return (
    <Surface variant={c.variant}>
      {c.heading && (
        <h2 className="mb-8 text-3xl font-bold sm:text-4xl">{c.heading}</h2>
      )}
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        {stats.map((s, i) => (
          <div key={i}>
            <div className="text-4xl font-bold sm:text-5xl">{s.value}</div>
            <div className={cn('mt-1 text-sm', mutedClass(c.variant))}>
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </Surface>
  );
}

function BigNumberSlide({ c }: { c: Content }) {
  return (
    <Surface variant={c.variant} className="items-center text-center">
      <Eyebrow variant={c.variant}>{c.eyebrow}</Eyebrow>
      <div className="text-7xl font-black sm:text-8xl">{c.value}</div>
      <div className="mt-2 text-xl font-medium">{c.label}</div>
      {c.body && (
        <p className={cn('mt-4 max-w-xl', mutedClass(c.variant))}>{c.body}</p>
      )}
      {c.source && (
        <p className={cn('mt-4 text-xs', mutedClass(c.variant))}>{c.source}</p>
      )}
    </Surface>
  );
}

function CtaSlide({ c }: { c: Content }) {
  return (
    <Surface
      variant={c.variant ?? 'accent'}
      className="items-center text-center"
    >
      <Eyebrow variant={c.variant ?? 'accent'}>{c.eyebrow}</Eyebrow>
      <h2 className="max-w-2xl text-3xl font-bold sm:text-4xl">{c.heading}</h2>
      {c.body && (
        <p className={cn('mt-4 max-w-xl', mutedClass(c.variant ?? 'accent'))}>
          {c.body}
        </p>
      )}
      {c.buttonLabel && !c.hideButton && (
        <span className="mt-8 inline-flex items-center rounded-full bg-white px-8 py-3 font-semibold text-neutral-900 shadow">
          {c.buttonLabel}
        </span>
      )}
    </Surface>
  );
}

function ContactSlide({ c }: { c: Content }) {
  const links: Content[] = c.links ?? [];
  return (
    <Surface variant={c.variant}>
      <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
        {c.heading ?? 'Contact'}
      </h2>
      {c.name && <p className="text-lg font-medium">{c.name}</p>}
      {c.email && (
        <p className={cn('mt-1', mutedClass(c.variant))}>{c.email}</p>
      )}
      {links.length > 0 && (
        <ul className="mt-4 space-y-1">
          {links.map((l, i) => (
            <li key={i} className={mutedClass(c.variant)}>
              {l.label}: {l.url}
            </li>
          ))}
        </ul>
      )}
    </Surface>
  );
}

/** 未实现类型的兜底渲染（heading + 内容预览），保证整 deck 可渲染。 */
function FallbackSlide({ c, type }: { c: Content; type: string }) {
  return (
    <Surface variant={c.variant}>
      {c.heading && <h2 className="mb-4 text-2xl font-bold">{c.heading}</h2>}
      <p className="text-muted-foreground mb-3 text-xs uppercase">{type}</p>
      <pre className="text-muted-foreground overflow-auto rounded-lg bg-black/5 p-4 text-xs">
        {JSON.stringify(c, null, 2)}
      </pre>
    </Surface>
  );
}

function ProcessSlide({ c }: { c: Content }) {
  const steps: Content[] = c.steps ?? [];
  return (
    <Surface variant={c.variant}>
      {c.heading && (
        <h2 className="mb-8 text-3xl font-bold sm:text-4xl">{c.heading}</h2>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((s, i) => (
          <div key={i} className="border-border/40 rounded-2xl border p-4">
            <div className="bg-primary text-primary-foreground mb-2 inline-flex size-7 items-center justify-center rounded-full text-sm font-bold">
              {i + 1}
            </div>
            <div className="font-medium">{s.title}</div>
            {s.detail && (
              <div className={cn('mt-1 text-sm', mutedClass(c.variant))}>
                {s.detail}
              </div>
            )}
          </div>
        ))}
      </div>
    </Surface>
  );
}

function CompareSlide({ c }: { c: Content }) {
  const col = (side: Content, accent: boolean) => (
    <div
      className={cn(
        'flex-1 rounded-2xl border p-6',
        accent ? 'border-primary/40 bg-primary/5' : 'border-border/40'
      )}
    >
      <div className="mb-2 font-semibold">{side?.label}</div>
      <p className={cn('text-sm', mutedClass(c.variant))}>{side?.body}</p>
    </div>
  );
  return (
    <Surface variant={c.variant}>
      {c.heading && (
        <h2 className="mb-6 text-3xl font-bold sm:text-4xl">{c.heading}</h2>
      )}
      <div className="flex flex-col gap-4 sm:flex-row">
        {col(c.left, false)}
        {col(c.right, true)}
      </div>
      {c.footnote && (
        <p className={cn('mt-4 text-xs', mutedClass(c.variant))}>
          {c.footnote}
        </p>
      )}
    </Surface>
  );
}

function SwotSlide({ c }: { c: Content }) {
  const quad = (title: string, items: string[]) => (
    <div className="border-border/40 rounded-2xl border p-4">
      <div className="text-primary mb-2 text-sm font-semibold">{title}</div>
      <ul className={cn('space-y-1 text-sm', mutedClass(c.variant))}>
        {(items ?? []).map((it, i) => (
          <li key={i}>· {it}</li>
        ))}
      </ul>
    </div>
  );
  return (
    <Surface variant={c.variant}>
      {c.heading && (
        <h2 className="mb-6 text-3xl font-bold sm:text-4xl">{c.heading}</h2>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {quad('Strengths', c.strengths)}
        {quad('Weaknesses', c.weaknesses)}
        {quad('Opportunities', c.opportunities)}
        {quad('Threats', c.threats)}
      </div>
    </Surface>
  );
}

function CaseStudySlide({ c }: { c: Content }) {
  const block = (label: string, body: string) => (
    <div>
      <div className="text-primary text-sm font-semibold">{label}</div>
      <p className={cn('mt-1 text-sm', mutedClass(c.variant))}>{body}</p>
    </div>
  );
  return (
    <Surface variant={c.variant}>
      {(c.heading || c.client) && (
        <h2 className="mb-6 text-3xl font-bold sm:text-4xl">
          {c.heading ?? c.client}
        </h2>
      )}
      <div className="space-y-4">
        {block('Problem', c.problem)}
        {block('Solution', c.solution)}
        {block('Result', c.result)}
      </div>
    </Surface>
  );
}

function KpiSlide({ c }: { c: Content }) {
  const kpis: Content[] = c.kpis ?? [];
  const arrow = (t?: string) => (t === 'up' ? '▲' : t === 'down' ? '▼' : '—');
  const color = (t?: string) =>
    t === 'up' ? 'text-primary' : t === 'down' ? 'text-destructive' : '';
  return (
    <Surface variant={c.variant}>
      {c.heading && (
        <h2 className="mb-8 text-3xl font-bold sm:text-4xl">{c.heading}</h2>
      )}
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
        {kpis.map((k, i) => (
          <div key={i}>
            <div className={cn('text-sm', mutedClass(c.variant))}>
              {k.label}
            </div>
            <div className="text-3xl font-bold sm:text-4xl">{k.value}</div>
            {k.delta && (
              <div className={cn('text-sm', color(k.trend))}>
                {arrow(k.trend)} {k.delta}
              </div>
            )}
          </div>
        ))}
      </div>
    </Surface>
  );
}

function ChartSlide({ c }: { c: Content }) {
  const series: Content[] = c.series ?? [];
  const max = Math.max(1, ...series.map((s) => Number(s.value) || 0));
  return (
    <Surface variant={c.variant}>
      {c.heading && (
        <h2 className="mb-6 text-3xl font-bold sm:text-4xl">{c.heading}</h2>
      )}
      <div className="flex h-48 items-end gap-3">
        {series.map((s, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-2">
            <div
              className="brand-gradient w-full rounded-t-lg"
              style={{ height: `${((Number(s.value) || 0) / max) * 100}%` }}
            />
            <div className={cn('text-xs', mutedClass(c.variant))}>
              {s.label}
            </div>
          </div>
        ))}
      </div>
      {c.note && (
        <p className={cn('mt-4 text-xs', mutedClass(c.variant))}>{c.note}</p>
      )}
    </Surface>
  );
}

function ImageSlide({ c }: { c: Content }) {
  return (
    <Surface variant={c.variant} className="p-0">
      {c.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={c.imageUrl}
          alt={c.heading ?? ''}
          className={cn(
            'absolute inset-0 size-full',
            c.fit === 'contain' ? 'object-contain' : 'object-cover'
          )}
        />
      )}
      {(c.heading || c.caption) && (
        <div className="relative mt-auto bg-gradient-to-t from-black/70 to-transparent p-8 text-white">
          {c.heading && <h2 className="text-2xl font-bold">{c.heading}</h2>}
          {c.caption && (
            <p className="mt-1 text-sm text-white/80">{c.caption}</p>
          )}
        </div>
      )}
    </Surface>
  );
}

// 图片一侧占整页宽度的比例（另一侧文字占余下）。缺省=各半。
const IMAGE_TEXT_RATIO: Record<string, string> = {
  half: '50%',
  third: '33.333%',
  twoFifths: '40%',
  threeFifths: '60%',
  twoThirds: '66.667%',
};

function ImageTextSlide({ c }: { c: Content }) {
  const imgRight = c.imageSide === 'right';
  const bullets: string[] = Array.isArray(c.bullets) ? c.bullets : [];
  const imgWidth = IMAGE_TEXT_RATIO[c.imageRatio as string] ?? '50%';
  const img = (
    <div
      className="bg-muted relative shrink-0 self-stretch overflow-hidden"
      style={{ width: imgWidth }}
    >
      {c.imageUrl && (
        <img
          src={c.imageUrl}
          alt={c.heading ?? ''}
          className={cn(
            'absolute inset-0 size-full',
            c.fit === 'contain' ? 'object-contain' : 'object-cover'
          )}
        />
      )}
    </div>
  );
  const text = (
    <div className="flex min-w-0 flex-1 flex-col justify-center p-10 sm:p-14">
      {c.heading && (
        <h2 className="mb-4 text-3xl font-bold sm:text-4xl">{c.heading}</h2>
      )}
      {c.body && (
        <p className={cn('text-lg leading-relaxed', mutedClass(c.variant))}>
          {c.body}
        </p>
      )}
      {bullets.length > 0 && (
        <ul className="mt-4 space-y-2">
          {bullets.map((b, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-primary mt-1">•</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}
      {c.caption && (
        <p className={cn('mt-6 text-sm', mutedClass(c.variant))}>{c.caption}</p>
      )}
    </div>
  );
  return (
    <Surface variant={c.variant} className="flex-row p-0 sm:p-0">
      {imgRight ? (
        <>
          {text}
          {img}
        </>
      ) : (
        <>
          {img}
          {text}
        </>
      )}
    </Surface>
  );
}

function HtmlSlide({ c }: { c: Content }) {
  const html = typeof c.html === 'string' ? c.html : '';
  return (
    <Surface variant={c.variant} className="p-0">
      {html.trim() ? (
        <iframe
          // 沙箱：默认不放行脚本/表单/弹窗，仅渲染静态 HTML+CSS，
          // 天然隔离样式，并挡掉内嵌 <script> 的 XSS 风险。
          // pointer-events-none：让点击/键盘仍由外层幻灯片处理（翻页/选中）。
          sandbox=""
          srcDoc={html}
          title="custom-html"
          referrerPolicy="no-referrer"
          className="pointer-events-none absolute inset-0 size-full border-0 bg-white"
        />
      ) : (
        <div className="text-muted-foreground/60 flex size-full items-center justify-center font-mono text-sm">
          &lt;html /&gt;
        </div>
      )}
    </Surface>
  );
}

function ImageGridSlide({ c }: { c: Content }) {
  const images: Content[] = Array.isArray(c.images) ? c.images : [];
  const cols = Math.min(Math.max(images.length, 1), 4);
  return (
    <Surface variant={c.variant}>
      {c.heading && <H>{c.heading}</H>}
      <div
        className="grid min-h-0 flex-1 gap-4"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {images.map((im, i) => (
          <figure key={i} className="flex min-h-0 flex-col">
            <div className="bg-muted relative min-h-0 flex-1 overflow-hidden rounded-xl">
              {im.imageUrl && (
                <img
                  src={im.imageUrl}
                  alt=""
                  className={cn(
                    'absolute inset-0 size-full',
                    c.fit === 'contain' ? 'object-contain' : 'object-cover'
                  )}
                />
              )}
            </div>
            {im.caption && (
              <figcaption
                className={cn(
                  'mt-2 text-center text-sm',
                  mutedClass(c.variant)
                )}
              >
                {im.caption}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
    </Surface>
  );
}

function TimelineSlide({ c }: { c: Content }) {
  const events: Content[] = c.events ?? [];
  return (
    <Surface variant={c.variant}>
      {c.heading && (
        <h2 className="mb-6 text-3xl font-bold sm:text-4xl">{c.heading}</h2>
      )}
      <ol className="border-border/50 relative space-y-4 border-l pl-6">
        {events.map((e, i) => (
          <li key={i} className="relative">
            <span className="bg-primary absolute top-1.5 -left-[1.7rem] size-3 rounded-full" />
            <div className="text-primary text-sm font-semibold">{e.date}</div>
            <div className="font-medium">{e.title}</div>
            {e.detail && (
              <div className={cn('text-sm', mutedClass(c.variant))}>
                {e.detail}
              </div>
            )}
          </li>
        ))}
      </ol>
    </Surface>
  );
}

function DataTableSlide({ c }: { c: Content }) {
  const columns: string[] = c.columns ?? [];
  const rows: string[][] = c.rows ?? [];
  return (
    <Surface variant={c.variant}>
      {c.heading && (
        <h2 className="mb-6 text-3xl font-bold sm:text-4xl">{c.heading}</h2>
      )}
      <div className="overflow-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-border/50 border-b">
              {columns.map((col, i) => (
                <th key={i} className="py-2 pr-4 font-semibold">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-border/20 border-b">
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className={cn('py-2 pr-4', mutedClass(c.variant))}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Surface>
  );
}

// ════════ 批次 1 渲染器（对齐 heydecks）════════

function H({ children }: { children?: any }) {
  if (!children) return null;
  return <h2 className="mb-6 text-3xl font-bold sm:text-4xl">{children}</h2>;
}

// ── Open ──
function AuthorSlide({ c }: { c: Content }) {
  return (
    <Surface variant={c.variant}>
      <div className="flex items-center gap-6">
        <div className="bg-primary/15 text-primary flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-3xl font-bold">
          {c.avatarUrl ? (
            <img src={c.avatarUrl} alt="" className="size-full object-cover" />
          ) : (
            (c.name?.[0] ?? 'A')
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-4xl font-bold">{c.name}</h1>
          {c.role && (
            <p className={cn('mt-1 text-lg', eyebrowClass(c.variant))}>
              {c.role}
            </p>
          )}
          {c.bio && (
            <p className={cn('mt-3 max-w-4xl', mutedClass(c.variant))}>
              {c.bio}
            </p>
          )}
        </div>
      </div>
    </Surface>
  );
}
function TocSlide({ c }: { c: Content }) {
  const items: Content[] = c.items ?? [];
  return (
    <Surface variant={c.variant}>
      <H>{c.heading ?? 'Contents'}</H>
      <ol className="grid grid-cols-1 gap-x-10 gap-y-3 sm:grid-cols-2">
        {items.map((it, i) => (
          <li key={i} className="flex items-baseline gap-3">
            <span className={cn('text-sm font-bold', eyebrowClass(c.variant))}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="font-medium">{it.label}</span>
            {it.note && (
              <span className={cn('text-sm', mutedClass(c.variant))}>
                — {it.note}
              </span>
            )}
          </li>
        ))}
      </ol>
    </Surface>
  );
}
function AnecdoteSlide({ c }: { c: Content }) {
  return (
    <Surface variant={c.variant}>
      <Eyebrow variant={c.variant}>{c.eyebrow}</Eyebrow>
      <p className="text-2xl leading-relaxed font-medium sm:text-3xl">
        “{c.story}”
      </p>
      {c.takeaway && (
        <p className={cn('mt-6 max-w-4xl', mutedClass(c.variant))}>
          {c.takeaway}
        </p>
      )}
    </Surface>
  );
}
function ManifestoSlide({ c }: { c: Content }) {
  const lines: string[] = c.lines ?? [];
  return (
    <Surface variant={c.variant}>
      <Eyebrow variant={c.variant}>{c.eyebrow}</Eyebrow>
      <div className="space-y-2">
        {lines.map((l, i) => (
          <p key={i} className="text-3xl font-bold tracking-tight sm:text-4xl">
            {l}
          </p>
        ))}
      </div>
    </Surface>
  );
}
function DropCapSlide({ c }: { c: Content }) {
  const body: string = c.body ?? '';
  return (
    <Surface variant={c.variant}>
      <Eyebrow variant={c.variant}>{c.eyebrow}</Eyebrow>
      <p className="max-w-4xl text-lg leading-relaxed">
        <span className="text-primary float-left mr-3 text-7xl leading-[0.8] font-bold">
          {body.slice(0, 1)}
        </span>
        {body.slice(1)}
      </p>
    </Surface>
  );
}

// ── Argue ──
function CalloutCardSlide({ c }: { c: Content }) {
  const tone =
    c.kind === 'warning'
      ? 'border-amber-500 bg-amber-500/10'
      : c.kind === 'success'
        ? 'border-emerald-500 bg-emerald-500/10'
        : 'border-primary bg-primary/10';
  return (
    <Surface variant={c.variant}>
      <div className={cn('rounded-2xl border-l-4 p-6', tone)}>
        <h2 className="text-2xl font-bold">{c.title}</h2>
        <p className={cn('mt-2 text-lg', mutedClass(c.variant))}>{c.body}</p>
      </div>
    </Surface>
  );
}
function TwoCol({
  variant,
  heading,
  left,
  right,
  leftBody,
  rightBody,
}: {
  variant?: string;
  heading?: string;
  left: string;
  right: string;
  leftBody: string;
  rightBody: string;
}) {
  return (
    <Surface variant={variant}>
      <H>{heading}</H>
      <div className="grid gap-5 sm:grid-cols-2">
        {[
          [left, leftBody],
          [right, rightBody],
        ].map(([label, body], i) => (
          <div
            key={i}
            className="border-border/40 bg-background/40 rounded-2xl border p-5"
          >
            <p className={cn('mb-2 text-sm font-bold', eyebrowClass(variant))}>
              {label}
            </p>
            <p>{body}</p>
          </div>
        ))}
      </div>
    </Surface>
  );
}
function BeforeAfterSlide({ c }: { c: Content }) {
  return (
    <TwoCol
      variant={c.variant}
      heading={c.heading}
      left={c.before?.label ?? 'Before'}
      right={c.after?.label ?? 'After'}
      leftBody={c.before?.body ?? ''}
      rightBody={c.after?.body ?? ''}
    />
  );
}
function MythVsRealitySlide({ c }: { c: Content }) {
  return (
    <TwoCol
      variant={c.variant}
      heading={c.heading}
      left="Myth"
      right="Reality"
      leftBody={c.myth ?? ''}
      rightBody={c.reality ?? ''}
    />
  );
}
function TestimonialSlide({ c }: { c: Content }) {
  return (
    <Surface variant={c.variant}>
      <p className="text-2xl leading-relaxed font-medium sm:text-3xl">
        “{c.quote}”
      </p>
      {(c.author || c.role) && (
        <p className={cn('mt-6', mutedClass(c.variant))}>
          — {[c.author, c.role].filter(Boolean).join(', ')}
        </p>
      )}
    </Surface>
  );
}
function FaqSlide({ c }: { c: Content }) {
  const items: Content[] = c.items ?? [];
  return (
    <Surface variant={c.variant}>
      <H>{c.heading ?? 'FAQ'}</H>
      <div className="space-y-4">
        {items.map((it, i) => (
          <div key={i}>
            <p className="font-semibold">{it.q}</p>
            <p className={cn('mt-0.5', mutedClass(c.variant))}>{it.a}</p>
          </div>
        ))}
      </div>
    </Surface>
  );
}
function ChecklistSlide({ c }: { c: Content }) {
  const items: string[] = c.items ?? [];
  return (
    <Surface variant={c.variant}>
      <H>{c.heading}</H>
      <ul className="space-y-3">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="bg-primary/15 text-primary inline-flex size-6 shrink-0 items-center justify-center rounded-md text-sm font-bold">
              ✓
            </span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </Surface>
  );
}
function ValuePropSlide({ c }: { c: Content }) {
  return (
    <Surface variant={c.variant}>
      <Eyebrow variant={c.variant}>{c.eyebrow}</Eyebrow>
      <p className="text-3xl font-bold sm:text-4xl">{c.statement}</p>
      {c.forWho && (
        <p className={cn('mt-4', mutedClass(c.variant))}>For: {c.forWho}</p>
      )}
    </Surface>
  );
}
function PrincipleSlide({ c }: { c: Content }) {
  return (
    <Surface variant={c.variant}>
      {c.number && (
        <p className={cn('text-6xl font-bold', eyebrowClass(c.variant))}>
          {c.number}
        </p>
      )}
      <h2 className="mt-2 text-3xl font-bold sm:text-4xl">{c.title}</h2>
      <p className={cn('mt-4 max-w-4xl text-lg', mutedClass(c.variant))}>
        {c.body}
      </p>
    </Surface>
  );
}
function ActionItemsSlide({ c }: { c: Content }) {
  const items: Content[] = c.items ?? [];
  return (
    <Surface variant={c.variant}>
      <H>{c.heading ?? 'Action items'}</H>
      <ul className="space-y-3">
        {items.map((it, i) => (
          <li key={i} className="flex items-start justify-between gap-4">
            <span className="flex items-start gap-3">
              <span className="text-primary">☐</span>
              {it.task}
            </span>
            {(it.owner || it.due) && (
              <span className={cn('shrink-0 text-sm', mutedClass(c.variant))}>
                {[it.owner, it.due].filter(Boolean).join(' · ')}
              </span>
            )}
          </li>
        ))}
      </ul>
    </Surface>
  );
}
function ProConCardSlide({ c }: { c: Content }) {
  const pros: string[] = c.pros ?? [];
  const cons: string[] = c.cons ?? [];
  return (
    <Surface variant={c.variant}>
      <H>{c.heading}</H>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5">
          <p className="mb-2 font-bold text-emerald-600">Pros</p>
          <ul className="space-y-1.5">
            {pros.map((p, i) => (
              <li key={i}>+ {p}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-5">
          <p className="mb-2 font-bold text-red-600">Cons</p>
          <ul className="space-y-1.5">
            {cons.map((p, i) => (
              <li key={i}>− {p}</li>
            ))}
          </ul>
        </div>
      </div>
    </Surface>
  );
}

// ── Close ──
function PullQuoteWallSlide({ c }: { c: Content }) {
  const quotes: Content[] = c.quotes ?? [];
  const align =
    c.align === 'center'
      ? 'text-center'
      : c.align === 'right'
        ? 'text-right'
        : 'text-left';
  const sizeStyle =
    typeof c.size === 'number' ? { fontSize: `${c.size}px` } : undefined;
  return (
    <Surface variant={c.variant}>
      <div className={cn('space-y-4', align)}>
        {quotes.map((q, i) => (
          <p
            key={i}
            className={cn('font-medium', !sizeStyle && 'text-2xl')}
            style={sizeStyle}
          >
            “{q.text}”
            {q.author && (
              <span className={cn('ml-2 text-sm', mutedClass(c.variant))}>
                — {q.author}
              </span>
            )}
          </p>
        ))}
      </div>
    </Surface>
  );
}
function QuoteGridSlide({ c }: { c: Content }) {
  const quotes: Content[] = c.quotes ?? [];
  return (
    <Surface variant={c.variant}>
      <H>{c.heading}</H>
      <div className="grid gap-4 sm:grid-cols-2">
        {quotes.map((q, i) => (
          <div
            key={i}
            className="border-border/40 bg-background/40 rounded-2xl border p-4"
          >
            <p>“{q.text}”</p>
            {q.author && (
              <p className={cn('mt-2 text-sm', mutedClass(c.variant))}>
                — {q.author}
              </p>
            )}
          </div>
        ))}
      </div>
    </Surface>
  );
}
function ResourcesSlide({ c }: { c: Content }) {
  const items: Content[] = c.items ?? [];
  return (
    <Surface variant={c.variant}>
      <H>{c.heading ?? 'Resources'}</H>
      <ul className="space-y-2.5">
        {items.map((it, i) => (
          <li key={i} className="flex items-baseline gap-2">
            <span className={eyebrowClass(c.variant)}>→</span>
            <span className="font-medium">{it.label}</span>
            {it.url && (
              <span className={cn('text-sm', mutedClass(c.variant))}>
                {it.url}
              </span>
            )}
            {it.note && (
              <span className={cn('text-sm', mutedClass(c.variant))}>
                — {it.note}
              </span>
            )}
          </li>
        ))}
      </ul>
    </Surface>
  );
}
function ThanksCloseSlide({ c }: { c: Content }) {
  return (
    <Surface variant={c.variant} className="items-center text-center">
      <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
        {c.heading ?? 'Thank you'}
      </h1>
      {c.subtitle && (
        <p className={cn('mt-4 max-w-xl text-lg', mutedClass(c.variant))}>
          {c.subtitle}
        </p>
      )}
    </Surface>
  );
}
function OfferStackSlide({ c }: { c: Content }) {
  const items: Content[] = c.items ?? [];
  return (
    <Surface variant={c.variant}>
      <H>{c.heading}</H>
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li
            key={i}
            className="border-border/30 flex items-center justify-between border-b py-1.5"
          >
            <span>{it.label}</span>
            {it.value && (
              <span className={cn('text-sm', mutedClass(c.variant))}>
                {it.value}
              </span>
            )}
          </li>
        ))}
      </ul>
      {c.price && (
        <p className={cn('mt-4 text-3xl font-bold', eyebrowClass(c.variant))}>
          {c.price}
        </p>
      )}
      {c.note && (
        <p className={cn('mt-1 text-sm', mutedClass(c.variant))}>{c.note}</p>
      )}
    </Surface>
  );
}

// ════════ 批次 2 渲染器（Argue 剩余）════════

function Tbl({
  head,
  rows,
}: {
  head: (string | undefined)[];
  rows: React.ReactNode[][];
}) {
  return (
    <div className="overflow-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-border/40 border-b">
            {head.map((h, i) => (
              <th key={i} className="px-3 py-2 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-border/20 border-b">
              {r.map((cell, j) => (
                <td key={j} className="px-3 py-2">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
const RAG: Record<string, string> = {
  low: 'bg-emerald-500',
  med: 'bg-amber-500',
  high: 'bg-red-500',
  'on-track': 'bg-emerald-500',
  'at-risk': 'bg-amber-500',
  'off-track': 'bg-red-500',
};
function Dot({ k }: { k?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={cn(
          'inline-block size-2.5 rounded-full',
          RAG[k ?? ''] ?? 'bg-muted-foreground/40'
        )}
      />
      {k}
    </span>
  );
}

function ExerciseSlide({ c }: { c: Content }) {
  const steps: string[] = c.steps ?? [];
  return (
    <Surface variant={c.variant}>
      <div className="mb-3 flex items-center gap-3">
        <H>{c.heading ?? 'Exercise'}</H>
        {c.time && (
          <span className="bg-primary/15 text-primary rounded-full px-3 py-0.5 text-xs font-semibold">
            {c.time}
          </span>
        )}
      </div>
      <p className="mb-4 max-w-4xl text-lg">{c.prompt}</p>
      {steps.length > 0 && (
        <ol className="list-decimal space-y-1 pl-5">
          {steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      )}
    </Surface>
  );
}
function QuadrantSlide({ c }: { c: Content }) {
  const items: Content[] = c.items ?? [];
  const cell = (xv: string, yv: string) =>
    items.filter((it) => (it.x ?? 'low') === xv && (it.y ?? 'low') === yv);
  const Box = ({ list }: { list: Content[] }) => (
    <div className="border-border/40 bg-background/40 flex flex-wrap content-start gap-1.5 rounded-xl border p-3">
      {list.map((it, i) => (
        <span
          key={i}
          className="bg-primary/15 text-primary rounded-md px-2 py-0.5 text-xs"
        >
          {it.label}
        </span>
      ))}
    </div>
  );
  return (
    <Surface variant={c.variant}>
      <H>{c.heading}</H>
      <div className="grid grid-cols-2 grid-rows-2 gap-2">
        <Box list={cell('low', 'high')} />
        <Box list={cell('high', 'high')} />
        <Box list={cell('low', 'low')} />
        <Box list={cell('high', 'low')} />
      </div>
      <div
        className={cn(
          'mt-2 flex justify-between text-xs',
          mutedClass(c.variant)
        )}
      >
        <span>{c.xAxis ? `${c.xAxis} →` : ''}</span>
        <span>{c.yAxis ? `↑ ${c.yAxis}` : ''}</span>
      </div>
    </Surface>
  );
}
function ComparisonMatrixSlide({ c }: { c: Content }) {
  const rows: Content[] = c.rows ?? [];
  return (
    <Surface variant={c.variant}>
      <H>{c.heading}</H>
      <Tbl
        head={['', c.colA, c.colB, c.colC].filter((x, i) => i < 2 || x)}
        rows={rows.map((r) =>
          [r.label, r.a, r.b, c.colC ? r.c : undefined].filter(
            (_, i) => i < 3 || c.colC
          )
        )}
      />
    </Surface>
  );
}
function RecipeSlide({ c }: { c: Content }) {
  const ing: string[] = c.ingredients ?? [];
  const steps: string[] = c.steps ?? [];
  return (
    <Surface variant={c.variant}>
      <H>{c.heading}</H>
      <div className="grid gap-6 sm:grid-cols-[1fr_2fr]">
        <div>
          <p className={cn('mb-2 text-sm font-bold', eyebrowClass(c.variant))}>
            Ingredients
          </p>
          <ul className="space-y-1 text-sm">
            {ing.map((x, i) => (
              <li key={i}>• {x}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className={cn('mb-2 text-sm font-bold', eyebrowClass(c.variant))}>
            Method
          </p>
          <ol className="list-decimal space-y-1 pl-5">
            {steps.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ol>
        </div>
      </div>
    </Surface>
  );
}
function PhaseStripSlide({ c }: { c: Content }) {
  const phases: Content[] = c.phases ?? [];
  return (
    <Surface variant={c.variant}>
      <H>{c.heading}</H>
      <div className="flex items-stretch gap-2">
        {phases.map((p, i) => (
          <div key={i} className="flex flex-1 items-center gap-2">
            <div className="border-border/40 bg-background/40 flex-1 rounded-xl border p-4">
              <p className="font-semibold">{p.label}</p>
              {p.detail && (
                <p className={cn('mt-1 text-sm', mutedClass(c.variant))}>
                  {p.detail}
                </p>
              )}
            </div>
            {i < phases.length - 1 && (
              <span className={eyebrowClass(c.variant)}>→</span>
            )}
          </div>
        ))}
      </div>
    </Surface>
  );
}
function RiskRegisterSlide({ c }: { c: Content }) {
  const risks: Content[] = c.risks ?? [];
  return (
    <Surface variant={c.variant}>
      <H>{c.heading ?? 'Risks'}</H>
      <Tbl
        head={['Risk', 'Likelihood', 'Impact', 'Mitigation']}
        rows={risks.map((r) => [
          r.risk,
          <Dot k={r.likelihood} />,
          <Dot k={r.impact} />,
          r.mitigation,
        ])}
      />
    </Surface>
  );
}
function QuizSlide({ c }: { c: Content }) {
  const options: string[] = c.options ?? [];
  return (
    <Surface variant={c.variant}>
      <p className="mb-5 text-2xl font-bold sm:text-3xl">{c.question}</p>
      <ul className="space-y-2">
        {options.map((o, i) => (
          <li key={i} className="flex items-center gap-3">
            <span className="bg-primary/15 text-primary inline-flex size-7 items-center justify-center rounded-full text-sm font-bold">
              {String.fromCharCode(65 + i)}
            </span>
            {o}
          </li>
        ))}
      </ul>
      {c.answer && (
        <p className={cn('mt-4 text-sm', eyebrowClass(c.variant))}>
          ✓ {c.answer}
        </p>
      )}
    </Surface>
  );
}
function ReflectionSlide({ c }: { c: Content }) {
  return (
    <Surface variant={c.variant} className="items-center text-center">
      <Eyebrow variant={c.variant}>{c.eyebrow ?? 'Reflect'}</Eyebrow>
      <p className="max-w-2xl text-2xl font-medium sm:text-3xl">{c.prompt}</p>
    </Surface>
  );
}
function StatusUpdateSlide({ c }: { c: Content }) {
  const items: Content[] = c.items ?? [];
  return (
    <Surface variant={c.variant}>
      <H>{c.heading ?? 'Status'}</H>
      <ul className="space-y-2.5">
        {items.map((it, i) => (
          <li key={i} className="flex items-center justify-between gap-4">
            <span className="font-medium">{it.workstream}</span>
            <span className="flex items-center gap-4">
              {it.note && (
                <span className={cn('text-sm', mutedClass(c.variant))}>
                  {it.note}
                </span>
              )}
              <Dot k={it.status} />
            </span>
          </li>
        ))}
      </ul>
    </Surface>
  );
}
function OkrSlide({ c }: { c: Content }) {
  const krs: string[] = c.keyResults ?? [];
  return (
    <Surface variant={c.variant}>
      <p className={cn('text-sm font-bold', eyebrowClass(c.variant))}>
        OBJECTIVE
      </p>
      <h2 className="mb-5 text-2xl font-bold sm:text-3xl">{c.objective}</h2>
      <ul className="space-y-2">
        {krs.map((k, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className={eyebrowClass(c.variant)}>◆</span>
            {k}
          </li>
        ))}
      </ul>
    </Surface>
  );
}
function DecisionMatrixSlide({ c }: { c: Content }) {
  const options: Content[] = c.options ?? [];
  return (
    <Surface variant={c.variant}>
      <H>{c.heading}</H>
      <ul className="space-y-2">
        {options.map((o, i) => {
          const win = c.winner && o.label === c.winner;
          return (
            <li
              key={i}
              className={cn(
                'flex items-center justify-between gap-4 rounded-xl border px-4 py-2.5',
                win
                  ? 'border-primary bg-primary/10'
                  : 'border-border/40 bg-background/40'
              )}
            >
              <span className="font-medium">
                {o.label}
                {win && <span className="ml-2">★</span>}
              </span>
              <span className="flex items-center gap-4">
                {o.note && (
                  <span className={cn('text-sm', mutedClass(c.variant))}>
                    {o.note}
                  </span>
                )}
                {o.score && <span className="font-bold">{o.score}</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </Surface>
  );
}
function RaciSlide({ c }: { c: Content }) {
  const rows: Content[] = c.rows ?? [];
  return (
    <Surface variant={c.variant}>
      <H>{c.heading ?? 'RACI'}</H>
      <Tbl
        head={['Task', 'R', 'A', 'C', 'I']}
        rows={rows.map((r) => [
          r.task,
          r.responsible,
          r.accountable,
          r.consulted,
          r.informed,
        ])}
      />
    </Surface>
  );
}
function SocialProofSlide({ c }: { c: Content }) {
  const logos: string[] = c.logos ?? [];
  const stats: Content[] = c.stats ?? [];
  return (
    <Surface variant={c.variant}>
      <H>{c.heading}</H>
      {logos.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {logos.map((l, i) => (
            <span
              key={i}
              className="border-border/40 bg-background/40 rounded-lg border px-3 py-1.5 text-sm font-medium"
            >
              {l}
            </span>
          ))}
        </div>
      )}
      {c.quote && <p className="mb-5 text-xl font-medium">“{c.quote}”</p>}
      {stats.length > 0 && (
        <div className="flex gap-10">
          {stats.map((s, i) => (
            <div key={i}>
              <div className="text-3xl font-bold">{s.value}</div>
              <div className={cn('text-sm', mutedClass(c.variant))}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      )}
    </Surface>
  );
}
function LearningObjectivesSlide({ c }: { c: Content }) {
  const items: string[] = c.items ?? [];
  return (
    <Surface variant={c.variant}>
      <H>{c.heading ?? 'Learning objectives'}</H>
      <ul className="space-y-3">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className={eyebrowClass(c.variant)}>◎</span>
            {it}
          </li>
        ))}
      </ul>
    </Surface>
  );
}

// ════════ 批次 3 渲染器（Show 前 18）════════

function CardGrid({
  variant,
  heading,
  cards,
}: {
  variant?: string;
  heading?: string;
  cards: { title: string; detail?: string }[];
}) {
  return (
    <Surface variant={variant}>
      <H>{heading}</H>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c, i) => (
          <div
            key={i}
            className="border-border/40 bg-background/40 rounded-2xl border p-4"
          >
            <p className="font-semibold">{c.title}</p>
            {c.detail && (
              <p className={cn('mt-1 text-sm', mutedClass(variant))}>
                {c.detail}
              </p>
            )}
          </div>
        ))}
      </div>
    </Surface>
  );
}
function Chips({
  variant,
  heading,
  chips,
}: {
  variant?: string;
  heading?: string;
  chips: string[];
}) {
  return (
    <Surface variant={variant}>
      <H>{heading}</H>
      <div className="flex flex-wrap gap-2.5">
        {chips.map((x, i) => (
          <span
            key={i}
            className="border-border/40 bg-background/40 rounded-lg border px-4 py-2 font-medium"
          >
            {x}
          </span>
        ))}
      </div>
    </Surface>
  );
}
function CodeBox({ children }: { children: string }) {
  return (
    <pre className="overflow-auto rounded-xl bg-neutral-900 p-4 font-mono text-sm leading-relaxed text-neutral-100">
      <code>{children}</code>
    </pre>
  );
}

function RoadmapSlide({ c }: { c: Content }) {
  const ms: Content[] = c.milestones ?? [];
  return (
    <Surface variant={c.variant}>
      <H>{c.heading ?? 'Roadmap'}</H>
      <div className="flex items-stretch gap-3">
        {ms.map((m, i) => (
          <div key={i} className="flex-1">
            <div className={cn('text-sm font-bold', eyebrowClass(c.variant))}>
              {m.date}
            </div>
            <div className="bg-primary/60 my-2 h-1 rounded-full" />
            <p className="font-semibold">{m.title}</p>
            {m.detail && (
              <p className={cn('mt-1 text-sm', mutedClass(c.variant))}>
                {m.detail}
              </p>
            )}
          </div>
        ))}
      </div>
    </Surface>
  );
}
function ServicesSlide({ c }: { c: Content }) {
  return (
    <CardGrid variant={c.variant} heading={c.heading} cards={c.items ?? []} />
  );
}
function PricingSlide({ c }: { c: Content }) {
  const tiers: Content[] = c.tiers ?? [];
  return (
    <Surface variant={c.variant}>
      <H>{c.heading ?? 'Pricing'}</H>
      <div className="grid gap-4 sm:grid-cols-3">
        {tiers.map((t, i) => (
          <div
            key={i}
            className="border-border/40 bg-background/40 rounded-2xl border p-5"
          >
            <p className="font-semibold">{t.name}</p>
            <p className="my-2 text-3xl font-bold">{t.price}</p>
            {t.features && (
              <ul className={cn('space-y-1 text-sm', mutedClass(c.variant))}>
                {String(t.features)
                  .split('\n')
                  .filter(Boolean)
                  .map((f: string, j: number) => (
                    <li key={j}>• {f}</li>
                  ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </Surface>
  );
}
function TeamSlide({ c }: { c: Content }) {
  const members: Content[] = c.members ?? [];
  return (
    <Surface variant={c.variant}>
      <H>{c.heading ?? 'Team'}</H>
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
        {members.map((m, i) => (
          <div key={i} className="text-center">
            <div className="bg-primary/15 text-primary mx-auto flex size-16 items-center justify-center overflow-hidden rounded-full text-xl font-bold">
              {m.avatarUrl ? (
                <img
                  src={m.avatarUrl}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                (m.name?.[0] ?? '?')
              )}
            </div>
            <p className="mt-2 font-medium">{m.name}</p>
            {m.role && (
              <p className={cn('text-xs', mutedClass(c.variant))}>{m.role}</p>
            )}
          </div>
        ))}
      </div>
    </Surface>
  );
}
function LogosSlide({ c }: { c: Content }) {
  return (
    <Chips variant={c.variant} heading={c.heading} chips={c.logos ?? []} />
  );
}
function IntegrationsSlide({ c }: { c: Content }) {
  return (
    <Chips variant={c.variant} heading={c.heading} chips={c.items ?? []} />
  );
}
function TechStackSlide({ c }: { c: Content }) {
  const groups: Content[] = c.groups ?? [];
  return (
    <Surface variant={c.variant}>
      <H>{c.heading ?? 'Tech stack'}</H>
      <div className="space-y-3">
        {groups.map((g, i) => (
          <div key={i} className="flex gap-3">
            <span
              className={cn(
                'w-28 shrink-0 text-sm font-bold',
                eyebrowClass(c.variant)
              )}
            >
              {g.category}
            </span>
            <span>{g.tools}</span>
          </div>
        ))}
      </div>
    </Surface>
  );
}
function ProductShowcaseSlide({ c }: { c: Content }) {
  const items: Content[] = c.items ?? [];
  return (
    <Surface variant={c.variant}>
      <H>{c.heading}</H>
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((it, i) => (
          <div key={i}>
            <div className="bg-muted aspect-video overflow-hidden rounded-xl">
              {it.imageUrl && (
                <img
                  src={it.imageUrl}
                  alt=""
                  className="size-full object-cover"
                />
              )}
            </div>
            {it.caption && (
              <p className={cn('mt-1 text-sm', mutedClass(c.variant))}>
                {it.caption}
              </p>
            )}
          </div>
        ))}
      </div>
    </Surface>
  );
}
function ReleaseNotesSlide({ c }: { c: Content }) {
  const items: Content[] = c.items ?? [];
  const tag: Record<string, string> = {
    new: 'bg-emerald-500/15 text-emerald-600',
    fix: 'bg-red-500/15 text-red-600',
    improve: 'bg-blue-500/15 text-blue-600',
  };
  return (
    <Surface variant={c.variant}>
      <div className="mb-4 flex items-center gap-3">
        <H>{c.heading ?? 'Release notes'}</H>
        {c.version && (
          <span className="bg-primary/15 text-primary rounded-full px-3 py-0.5 text-xs font-semibold">
            {c.version}
          </span>
        )}
      </div>
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-2">
            {it.kind && (
              <span
                className={cn(
                  'rounded px-1.5 py-0.5 text-xs font-semibold',
                  tag[it.kind] ?? 'bg-muted'
                )}
              >
                {it.kind}
              </span>
            )}
            <span>{it.text}</span>
          </li>
        ))}
      </ul>
    </Surface>
  );
}
function CodeBlockSlide({ c }: { c: Content }) {
  return (
    <Surface variant={c.variant}>
      {(c.heading || c.language) && (
        <div className="mb-2 flex items-center justify-between">
          <span className="font-semibold">{c.heading}</span>
          {c.language && (
            <span className={cn('text-xs', mutedClass(c.variant))}>
              {c.language}
            </span>
          )}
        </div>
      )}
      <CodeBox>{c.code ?? ''}</CodeBox>
    </Surface>
  );
}
function TerminalSlide({ c }: { c: Content }) {
  return (
    <Surface variant={c.variant}>
      <H>{c.heading}</H>
      <CodeBox>
        {(c.command ? `$ ${c.command}\n` : '') + (c.output ?? '')}
      </CodeBox>
    </Surface>
  );
}
function DiffSlide({ c }: { c: Content }) {
  return (
    <Surface variant={c.variant}>
      <H>{c.heading}</H>
      <div className="grid gap-3 sm:grid-cols-2">
        <pre className="overflow-auto rounded-xl border border-red-500/40 bg-red-500/10 p-3 font-mono text-xs">
          <code>{c.before}</code>
        </pre>
        <pre className="overflow-auto rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 font-mono text-xs">
          <code>{c.after}</code>
        </pre>
      </div>
    </Surface>
  );
}
function FinancialsSlide({ c }: { c: Content }) {
  const rows: Content[] = c.rows ?? [];
  return (
    <Surface variant={c.variant}>
      <H>{c.heading ?? 'Financials'}</H>
      <Tbl
        head={['', 'Value', '']}
        rows={rows.map((r) => [
          r.label,
          <span className="font-semibold">{r.value}</span>,
          r.note,
        ])}
      />
    </Surface>
  );
}
function BarsSlide({
  variant,
  heading,
  rows,
  highlight,
  unit,
}: {
  variant?: string;
  heading?: string;
  rows: { label: string; value: number; display?: string }[];
  highlight?: string;
  unit?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value || 0));
  return (
    <Surface variant={variant}>
      <H>{heading}</H>
      <div className="space-y-2.5">
        {rows.map((r, i) => {
          const hl = highlight && r.label === highlight;
          return (
            <div key={i} className="flex items-center gap-3">
              <span className="w-28 shrink-0 truncate text-sm">{r.label}</span>
              <div className="bg-muted h-5 flex-1 overflow-hidden rounded-full">
                <div
                  className={cn(
                    'h-full rounded-full',
                    hl ? 'bg-primary' : 'bg-primary/50'
                  )}
                  style={{ width: `${((r.value || 0) / max) * 100}%` }}
                />
              </div>
              <span className="w-16 shrink-0 text-right text-sm font-semibold">
                {r.display ?? r.value}
                {unit}
              </span>
            </div>
          );
        })}
      </div>
    </Surface>
  );
}
function RevenueBreakdownSlide({ c }: { c: Content }) {
  const segs: Content[] = c.segments ?? [];
  return (
    <BarsSlide
      variant={c.variant}
      heading={c.heading ?? 'Revenue'}
      rows={segs.map((s) => ({
        label: s.label,
        value: typeof s.percent === 'number' ? s.percent : Number(s.value) || 0,
        display: s.value,
      }))}
    />
  );
}
function BenchmarkSlide({ c }: { c: Content }) {
  return (
    <BarsSlide
      variant={c.variant}
      heading={c.heading ?? 'Benchmark'}
      rows={(c.items ?? []).map((it: Content) => ({
        label: it.label,
        value: it.value,
      }))}
      highlight={c.highlight}
      unit={c.unit}
    />
  );
}
function UnitEconomicsSlide({ c }: { c: Content }) {
  const metrics: Content[] = c.metrics ?? [];
  return (
    <Surface variant={c.variant}>
      <H>{c.heading ?? 'Unit economics'}</H>
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
        {metrics.map((m, i) => (
          <div key={i}>
            <div className="text-3xl font-bold sm:text-4xl">{m.value}</div>
            <div className={cn('mt-1 text-sm', mutedClass(c.variant))}>
              {m.label}
            </div>
          </div>
        ))}
      </div>
    </Surface>
  );
}
function MarketSizingSlide({ c }: { c: Content }) {
  const layers = [
    { k: 'TAM', v: c.tam, w: 'w-full' },
    { k: 'SAM', v: c.sam, w: 'w-2/3' },
    { k: 'SOM', v: c.som, w: 'w-1/3' },
  ];
  return (
    <Surface variant={c.variant}>
      <H>{c.heading ?? 'Market size'}</H>
      <div className="space-y-2">
        {layers.map((l, i) => (
          <div
            key={i}
            className={cn(
              'bg-primary/15 flex items-center justify-between rounded-xl px-4 py-3',
              l.w
            )}
          >
            <span className={cn('font-bold', eyebrowClass(c.variant))}>
              {l.k}
            </span>
            <span className="font-semibold">{l.v}</span>
          </div>
        ))}
      </div>
      {c.note && (
        <p className={cn('mt-3 text-sm', mutedClass(c.variant))}>{c.note}</p>
      )}
    </Surface>
  );
}
function NpsScoreSlide({ c }: { c: Content }) {
  const parts = [
    ['Promoters', c.promoters, 'text-emerald-600'],
    ['Passives', c.passives, 'text-amber-600'],
    ['Detractors', c.detractors, 'text-red-600'],
  ].filter((p) => p[1]);
  return (
    <Surface variant={c.variant} className="items-center text-center">
      <div className="text-7xl font-black sm:text-8xl">{c.score}</div>
      <div className={cn('mt-1 text-lg font-medium', eyebrowClass(c.variant))}>
        NPS
      </div>
      {parts.length > 0 && (
        <div className="mt-6 flex gap-8">
          {parts.map(([label, val, color], i) => (
            <div key={i}>
              <div className={cn('text-2xl font-bold', color as string)}>
                {val as string}
              </div>
              <div className={cn('text-xs', mutedClass(c.variant))}>
                {label}
              </div>
            </div>
          ))}
        </div>
      )}
      {c.note && (
        <p className={cn('mt-4 text-sm', mutedClass(c.variant))}>{c.note}</p>
      )}
    </Surface>
  );
}

// ════════ 批次 4 渲染器（Show 剩余 19）════════

function EmbedSlide({ c }: { c: Content }) {
  return (
    <Surface variant={c.variant}>
      <H>{c.heading}</H>
      <div className="bg-muted flex aspect-video items-center justify-center rounded-xl">
        <span className="bg-primary text-primary-foreground flex size-16 items-center justify-center rounded-full text-2xl">
          ▶
        </span>
      </div>
      {(c.caption || c.url) && (
        <p className={cn('mt-2 text-sm', mutedClass(c.variant))}>
          {c.caption ?? c.url}
        </p>
      )}
    </Surface>
  );
}
function StoryboardSlide({ c }: { c: Content }) {
  const panels: Content[] = c.panels ?? [];
  return (
    <Surface variant={c.variant}>
      <H>{c.heading}</H>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {panels.map((p, i) => (
          <div
            key={i}
            className="border-border/40 bg-background/40 rounded-xl border p-3"
          >
            <div className={cn('text-xs font-bold', eyebrowClass(c.variant))}>
              {i + 1}
            </div>
            <p className="mt-1 text-sm">{p.caption}</p>
          </div>
        ))}
      </div>
    </Surface>
  );
}
function FunnelSlide({ c }: { c: Content }) {
  const stages: Content[] = c.stages ?? [];
  return (
    <Surface variant={c.variant}>
      <H>{c.heading ?? 'Funnel'}</H>
      <div className="space-y-1.5">
        {stages.map((s, i) => (
          <div
            key={i}
            className="bg-primary/70 text-primary-foreground mx-auto flex items-center justify-between rounded-md px-4 py-2"
            style={{ width: `${100 - i * (60 / Math.max(1, stages.length))}%` }}
          >
            <span className="text-sm font-medium">{s.label}</span>
            {s.value && <span className="text-sm">{s.value}</span>}
          </div>
        ))}
      </div>
    </Surface>
  );
}
function GaugeSlide({ c }: { c: Content }) {
  const max = Number(c.max) || 100;
  const pct = Math.min(100, Math.max(0, ((Number(c.value) || 0) / max) * 100));
  return (
    <Surface variant={c.variant} className="items-center text-center">
      <div className="text-6xl font-black sm:text-7xl">
        {c.value}
        {c.unit}
      </div>
      {c.label && <div className="mt-1 text-lg font-medium">{c.label}</div>}
      <div className="bg-muted mt-6 h-4 w-full max-w-md overflow-hidden rounded-full">
        <div
          className="bg-primary h-full rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className={cn('mt-1 text-xs', mutedClass(c.variant))}>
        {c.value} / {max}
        {c.unit}
      </div>
    </Surface>
  );
}
function CustomerJourneySlide({ c }: { c: Content }) {
  const stages: Content[] = c.stages ?? [];
  const face: Record<string, string> = {
    happy: '🙂',
    neutral: '😐',
    sad: '🙁',
  };
  return (
    <Surface variant={c.variant}>
      <H>{c.heading ?? 'Journey'}</H>
      <div className="flex gap-2">
        {stages.map((s, i) => (
          <div
            key={i}
            className="border-border/40 bg-background/40 flex-1 rounded-xl border p-3 text-center"
          >
            <div className="text-2xl">{face[s.feeling] ?? '•'}</div>
            <p className="mt-1 font-medium">{s.stage}</p>
            {s.action && (
              <p className={cn('mt-0.5 text-xs', mutedClass(c.variant))}>
                {s.action}
              </p>
            )}
          </div>
        ))}
      </div>
    </Surface>
  );
}
function WaterfallSlide({ c }: { c: Content }) {
  const steps: Content[] = c.steps ?? [];
  const max = Math.max(1, ...steps.map((s) => Math.abs(Number(s.value) || 0)));
  return (
    <Surface variant={c.variant}>
      <H>{c.heading}</H>
      <div className="space-y-2">
        {steps.map((s, i) => {
          const v = Number(s.value) || 0;
          return (
            <div key={i} className="flex items-center gap-3">
              <span className="w-28 shrink-0 truncate text-sm">{s.label}</span>
              <div className="bg-muted h-5 flex-1 overflow-hidden rounded">
                <div
                  className={cn(
                    'h-full',
                    v >= 0 ? 'bg-emerald-500' : 'bg-red-500'
                  )}
                  style={{ width: `${(Math.abs(v) / max) * 100}%` }}
                />
              </div>
              <span className="w-14 shrink-0 text-right text-sm font-semibold">
                {v > 0 ? '+' : ''}
                {v}
              </span>
            </div>
          );
        })}
      </div>
    </Surface>
  );
}
function MetricDashboardSlide({ c }: { c: Content }) {
  const metrics: Content[] = c.metrics ?? [];
  const sc: Record<string, string> = {
    good: 'text-emerald-600',
    warn: 'text-amber-600',
    bad: 'text-red-600',
  };
  const tr: Record<string, string> = { up: '↑', down: '↓', flat: '→' };
  return (
    <Surface variant={c.variant}>
      <H>{c.heading}</H>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {metrics.map((m, i) => (
          <div
            key={i}
            className="border-border/40 bg-background/40 rounded-xl border p-3"
          >
            <div className={cn('text-2xl font-bold', sc[m.status] ?? '')}>
              {m.value}{' '}
              {m.trend && <span className="text-base">{tr[m.trend]}</span>}
            </div>
            <div className={cn('mt-0.5 text-xs', mutedClass(c.variant))}>
              {m.label}
            </div>
          </div>
        ))}
      </div>
    </Surface>
  );
}
function TrafficLightSlide({ c }: { c: Content }) {
  const items: Content[] = c.items ?? [];
  const col: Record<string, string> = {
    red: 'bg-red-500',
    amber: 'bg-amber-500',
    green: 'bg-emerald-500',
  };
  return (
    <Surface variant={c.variant}>
      <H>{c.heading ?? 'Status'}</H>
      <ul className="space-y-2.5">
        {items.map((it, i) => (
          <li key={i} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-3 font-medium">
              <span
                className={cn(
                  'inline-block size-3 rounded-full',
                  col[it.status] ?? 'bg-muted-foreground/40'
                )}
              />
              {it.label}
            </span>
            {it.note && (
              <span className={cn('text-sm', mutedClass(c.variant))}>
                {it.note}
              </span>
            )}
          </li>
        ))}
      </ul>
    </Surface>
  );
}
function GanttSlide({ c }: { c: Content }) {
  const tasks: Content[] = c.tasks ?? [];
  const end = Math.max(
    1,
    ...tasks.map((t) => (Number(t.start) || 0) + (Number(t.span) || 1))
  );
  return (
    <Surface variant={c.variant}>
      <H>{c.heading}</H>
      <div className="space-y-2">
        {tasks.map((t, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="w-28 shrink-0 truncate text-sm">{t.label}</span>
            <div className="relative h-5 flex-1">
              <div
                className="bg-primary/70 absolute h-full rounded"
                style={{
                  left: `${((Number(t.start) || 0) / end) * 100}%`,
                  width: `${((Number(t.span) || 1) / end) * 100}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </Surface>
  );
}
function KanbanSlide({ c }: { c: Content }) {
  const cols: Content[] = c.columns ?? [];
  return (
    <Surface variant={c.variant}>
      <H>{c.heading}</H>
      <div className="grid gap-3 sm:grid-cols-3">
        {cols.map((col, i) => (
          <div key={i} className="bg-muted/40 rounded-xl p-3">
            <p
              className={cn('mb-2 text-sm font-bold', eyebrowClass(c.variant))}
            >
              {col.title}
            </p>
            <div className="space-y-1.5">
              {String(col.items ?? '')
                .split('\n')
                .filter(Boolean)
                .map((it: string, j: number) => (
                  <div
                    key={j}
                    className="border-border/40 bg-background rounded-md border px-2 py-1.5 text-sm"
                  >
                    {it}
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </Surface>
  );
}
function MilestonePlanSlide({ c }: { c: Content }) {
  const ms: Content[] = c.milestones ?? [];
  return (
    <Surface variant={c.variant}>
      <H>{c.heading ?? 'Milestones'}</H>
      <ul className="space-y-3">
        {ms.map((m, i) => (
          <li key={i} className="flex items-baseline gap-4">
            <span
              className={cn(
                'w-24 shrink-0 text-sm font-bold',
                eyebrowClass(c.variant)
              )}
            >
              {m.date}
            </span>
            <span>{m.label}</span>
          </li>
        ))}
      </ul>
    </Surface>
  );
}
function DependencyMapSlide({ c }: { c: Content }) {
  const items: Content[] = c.items ?? [];
  return (
    <Surface variant={c.variant}>
      <H>{c.heading ?? 'Dependencies'}</H>
      <ul className="space-y-2.5">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="font-medium">{it.label}</span>
            {it.dependsOn && (
              <>
                <span className={eyebrowClass(c.variant)}>←</span>
                <span className={mutedClass(c.variant)}>{it.dependsOn}</span>
              </>
            )}
          </li>
        ))}
      </ul>
    </Surface>
  );
}
function BusinessModelCanvasSlide({ c }: { c: Content }) {
  const blocks = [
    ['Key Partners', c.keyPartners],
    ['Key Activities', c.keyActivities],
    ['Key Resources', c.keyResources],
    ['Value Propositions', c.valuePropositions],
    ['Customer Relationships', c.customerRelationships],
    ['Channels', c.channels],
    ['Customer Segments', c.customerSegments],
    ['Cost Structure', c.costStructure],
    ['Revenue Streams', c.revenueStreams],
  ];
  return (
    <Surface variant={c.variant}>
      <div className="grid grid-cols-3 gap-2 text-xs">
        {blocks.map(([label, val], i) => (
          <div
            key={i}
            className="border-border/40 bg-background/40 rounded-lg border p-2"
          >
            <p className={cn('font-bold', eyebrowClass(c.variant))}>{label}</p>
            {val && <p className="mt-1">{val as string}</p>}
          </div>
        ))}
      </div>
    </Surface>
  );
}
function OrgChartSlide({ c }: { c: Content }) {
  const reports: Content[] = c.reports ?? [];
  return (
    <Surface variant={c.variant} className="items-center">
      <div className="bg-primary text-primary-foreground rounded-xl px-6 py-3 text-center">
        <p className="font-bold">{c.root}</p>
        {c.rootRole && <p className="text-xs opacity-80">{c.rootRole}</p>}
      </div>
      <div className="bg-border/60 my-3 h-5 w-px" />
      <div className="flex flex-wrap justify-center gap-3">
        {reports.map((r, i) => (
          <div
            key={i}
            className="border-border/40 bg-background/40 rounded-xl border px-4 py-2 text-center"
          >
            <p className="font-medium">{r.name}</p>
            {r.role && (
              <p className={cn('text-xs', mutedClass(c.variant))}>{r.role}</p>
            )}
          </div>
        ))}
      </div>
    </Surface>
  );
}
function SalesPipelineSlide({ c }: { c: Content }) {
  const stages: Content[] = c.stages ?? [];
  return (
    <Surface variant={c.variant}>
      <H>{c.heading ?? 'Pipeline'}</H>
      <div className="flex gap-2">
        {stages.map((s, i) => (
          <div
            key={i}
            className="border-border/40 bg-background/40 flex-1 rounded-xl border p-3 text-center"
          >
            <p className="text-sm font-medium">{s.label}</p>
            {s.value && <p className="mt-1 text-xl font-bold">{s.value}</p>}
            {s.count && (
              <p className={cn('text-xs', mutedClass(c.variant))}>
                {s.count} deals
              </p>
            )}
          </div>
        ))}
      </div>
    </Surface>
  );
}
function ChannelMixSlide({ c }: { c: Content }) {
  return (
    <BarsSlide
      variant={c.variant}
      heading={c.heading ?? 'Channels'}
      rows={(c.channels ?? []).map((x: Content) => ({
        label: x.label,
        value: x.value,
      }))}
    />
  );
}
function TechRadarSlide({ c }: { c: Content }) {
  const items: Content[] = c.items ?? [];
  const rings = ['adopt', 'trial', 'assess', 'hold'];
  return (
    <Surface variant={c.variant}>
      <H>{c.heading ?? 'Tech radar'}</H>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {rings.map((ring) => {
          const list = items.filter((it) => (it.ring ?? 'assess') === ring);
          return (
            <div key={ring}>
              <p
                className={cn(
                  'mb-1.5 text-sm font-bold capitalize',
                  eyebrowClass(c.variant)
                )}
              >
                {ring}
              </p>
              <div className="flex flex-wrap gap-1">
                {list.map((it, i) => (
                  <span
                    key={i}
                    className="bg-primary/15 text-primary rounded px-1.5 py-0.5 text-xs"
                  >
                    {it.label}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Surface>
  );
}
function ArchitectureSlide({ c }: { c: Content }) {
  const layers: Content[] = c.layers ?? [];
  return (
    <Surface variant={c.variant}>
      <H>{c.heading ?? 'Architecture'}</H>
      <div className="space-y-2">
        {layers.map((l, i) => (
          <div
            key={i}
            className="border-border/40 bg-background/40 flex items-center gap-4 rounded-xl border p-3"
          >
            <span
              className={cn('w-32 shrink-0 font-bold', eyebrowClass(c.variant))}
            >
              {l.label}
            </span>
            {l.components && (
              <span className={cn('text-sm', mutedClass(c.variant))}>
                {l.components}
              </span>
            )}
          </div>
        ))}
      </div>
    </Surface>
  );
}
function UserFlowSlide({ c }: { c: Content }) {
  const steps: string[] = c.steps ?? [];
  return (
    <Surface variant={c.variant}>
      <H>{c.heading ?? 'User flow'}</H>
      <div className="flex flex-wrap items-center gap-2">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="border-border/40 bg-background/40 rounded-lg border px-3 py-2 font-medium">
              {s}
            </span>
            {i < steps.length - 1 && (
              <span className={eyebrowClass(c.variant)}>→</span>
            )}
          </div>
        ))}
      </div>
    </Surface>
  );
}

function CanvasSlide({ c }: { c: Content }) {
  // 优先用 SVG（矢量，永不糊）；老画布页回退 PNG
  const src = (c.svg as string) || (c.png as string);
  return (
    <Surface variant={c.variant} className="items-center justify-center">
      {src ? (
        <img
          src={src}
          alt=""
          className="max-h-full max-w-full object-contain"
        />
      ) : (
        <p className={cn('text-center text-sm', mutedClass(c.variant))}>
          Canvas
        </p>
      )}
    </Surface>
  );
}

const RENDERERS: Record<string, (c: Content) => React.ReactNode> = {
  canvas: (c) => <CanvasSlide c={c} />,
  embed: (c) => <EmbedSlide c={c} />,
  storyboard: (c) => <StoryboardSlide c={c} />,
  funnel: (c) => <FunnelSlide c={c} />,
  gauge: (c) => <GaugeSlide c={c} />,
  customerJourney: (c) => <CustomerJourneySlide c={c} />,
  waterfall: (c) => <WaterfallSlide c={c} />,
  metricDashboard: (c) => <MetricDashboardSlide c={c} />,
  trafficLight: (c) => <TrafficLightSlide c={c} />,
  gantt: (c) => <GanttSlide c={c} />,
  kanban: (c) => <KanbanSlide c={c} />,
  milestonePlan: (c) => <MilestonePlanSlide c={c} />,
  dependencyMap: (c) => <DependencyMapSlide c={c} />,
  businessModelCanvas: (c) => <BusinessModelCanvasSlide c={c} />,
  orgChart: (c) => <OrgChartSlide c={c} />,
  salesPipeline: (c) => <SalesPipelineSlide c={c} />,
  channelMix: (c) => <ChannelMixSlide c={c} />,
  techRadar: (c) => <TechRadarSlide c={c} />,
  architecture: (c) => <ArchitectureSlide c={c} />,
  userFlow: (c) => <UserFlowSlide c={c} />,
  roadmap: (c) => <RoadmapSlide c={c} />,
  services: (c) => <ServicesSlide c={c} />,
  pricing: (c) => <PricingSlide c={c} />,
  team: (c) => <TeamSlide c={c} />,
  logos: (c) => <LogosSlide c={c} />,
  techStack: (c) => <TechStackSlide c={c} />,
  integrations: (c) => <IntegrationsSlide c={c} />,
  productShowcase: (c) => <ProductShowcaseSlide c={c} />,
  releaseNotes: (c) => <ReleaseNotesSlide c={c} />,
  codeBlock: (c) => <CodeBlockSlide c={c} />,
  terminal: (c) => <TerminalSlide c={c} />,
  diff: (c) => <DiffSlide c={c} />,
  financials: (c) => <FinancialsSlide c={c} />,
  revenueBreakdown: (c) => <RevenueBreakdownSlide c={c} />,
  unitEconomics: (c) => <UnitEconomicsSlide c={c} />,
  marketSizing: (c) => <MarketSizingSlide c={c} />,
  npsScore: (c) => <NpsScoreSlide c={c} />,
  benchmark: (c) => <BenchmarkSlide c={c} />,
  exercise: (c) => <ExerciseSlide c={c} />,
  quadrant: (c) => <QuadrantSlide c={c} />,
  comparisonMatrix: (c) => <ComparisonMatrixSlide c={c} />,
  recipe: (c) => <RecipeSlide c={c} />,
  phaseStrip: (c) => <PhaseStripSlide c={c} />,
  riskRegister: (c) => <RiskRegisterSlide c={c} />,
  quiz: (c) => <QuizSlide c={c} />,
  reflection: (c) => <ReflectionSlide c={c} />,
  statusUpdate: (c) => <StatusUpdateSlide c={c} />,
  okr: (c) => <OkrSlide c={c} />,
  decisionMatrix: (c) => <DecisionMatrixSlide c={c} />,
  raci: (c) => <RaciSlide c={c} />,
  socialProof: (c) => <SocialProofSlide c={c} />,
  learningObjectives: (c) => <LearningObjectivesSlide c={c} />,
  author: (c) => <AuthorSlide c={c} />,
  toc: (c) => <TocSlide c={c} />,
  anecdote: (c) => <AnecdoteSlide c={c} />,
  manifesto: (c) => <ManifestoSlide c={c} />,
  dropCap: (c) => <DropCapSlide c={c} />,
  calloutCard: (c) => <CalloutCardSlide c={c} />,
  beforeAfter: (c) => <BeforeAfterSlide c={c} />,
  testimonial: (c) => <TestimonialSlide c={c} />,
  faq: (c) => <FaqSlide c={c} />,
  checklist: (c) => <ChecklistSlide c={c} />,
  valueProp: (c) => <ValuePropSlide c={c} />,
  principle: (c) => <PrincipleSlide c={c} />,
  actionItems: (c) => <ActionItemsSlide c={c} />,
  proConCard: (c) => <ProConCardSlide c={c} />,
  mythVsReality: (c) => <MythVsRealitySlide c={c} />,
  pullQuoteWall: (c) => <PullQuoteWallSlide c={c} />,
  quoteGrid: (c) => <QuoteGridSlide c={c} />,
  resources: (c) => <ResourcesSlide c={c} />,
  thanksClose: (c) => <ThanksCloseSlide c={c} />,
  offerStack: (c) => <OfferStackSlide c={c} />,
  title: (c) => <TitleSlide c={c} />,
  agenda: (c) => <AgendaSlide c={c} />,
  statement: (c) => <StatementSlide c={c} />,
  chapter: (c) => <ChapterSlide c={c} />,
  bullets: (c) => <BulletsSlide c={c} />,
  stats: (c) => <StatsSlide c={c} />,
  bigNumber: (c) => <BigNumberSlide c={c} />,
  cta: (c) => <CtaSlide c={c} />,
  contactCard: (c) => <ContactSlide c={c} />,
  process: (c) => <ProcessSlide c={c} />,
  compare: (c) => <CompareSlide c={c} />,
  swot: (c) => <SwotSlide c={c} />,
  caseStudy: (c) => <CaseStudySlide c={c} />,
  kpi: (c) => <KpiSlide c={c} />,
  chart: (c) => <ChartSlide c={c} />,
  image: (c) => <ImageSlide c={c} />,
  imageText: (c) => <ImageTextSlide c={c} />,
  imageGrid: (c) => <ImageGridSlide c={c} />,
  timeline: (c) => <TimelineSlide c={c} />,
  dataTable: (c) => <DataTableSlide c={c} />,
  html: (c) => <HtmlSlide c={c} />,
};

export function renderSlide(
  slideType: string,
  content: Record<string, unknown>
): React.ReactNode {
  const r = RENDERERS[slideType];
  const node = r ? r(content) : <FallbackSlide c={content} type={slideType} />;
  const indent =
    typeof content.indent === 'number' ? content.indent : undefined;
  const fontScale =
    typeof content.fontScale === 'number' ? content.fontScale : undefined;
  if (indent == null && fontScale == null) return node;
  return (
    <SlideLayout.Provider value={{ indent, fontScale }}>
      {node}
    </SlideLayout.Provider>
  );
}
