import { cn } from '@/lib/utils';

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
  return (
    <div
      className={cn(
        'border-border/40 relative flex aspect-[16/9] w-full flex-col justify-center overflow-hidden rounded-[28px] border p-10 shadow-sm sm:p-14',
        surfaceClass(variant),
        className
      )}
    >
      {children}
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
            'mt-4 max-w-2xl text-lg sm:text-xl',
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
          className="absolute inset-0 size-full object-cover"
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

const RENDERERS: Record<string, (c: Content) => React.ReactNode> = {
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
  timeline: (c) => <TimelineSlide c={c} />,
  dataTable: (c) => <DataTableSlide c={c} />,
};

export function renderSlide(
  slideType: string,
  content: Record<string, unknown>
): React.ReactNode {
  const r = RENDERERS[slideType];
  return r ? r(content) : <FallbackSlide c={content} type={slideType} />;
}
