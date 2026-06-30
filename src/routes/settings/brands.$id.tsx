import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { toast } from 'sonner';

import { Link } from '@/core/i18n/navigation';
import { apiGet, apiPatch } from '@/lib/api-client';
import { m } from '@/paraglide/messages.js';
import { sampleSlideContent } from '@/components/deck/slide-form';
import { renderSlide } from '@/components/deck/slides';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface BrandDTO {
  id: string;
  name: string;
  palette: Record<string, string> | null;
  typography: Record<string, string> | null;
  tone: string | null;
}

const PALETTE_KEYS = [
  ['primary', 'settings.brands.primary'],
  ['secondary', 'settings.brands.secondary'],
  ['accent', 'settings.brands.accent'],
  ['background', 'settings.brands.background'],
  ['text', 'settings.brands.text'],
] as const;

// 预览用的代表性页面（覆盖各表面色调）
const PREVIEW_SLIDES: { type: string; variant?: string }[] = [
  { type: 'title', variant: 'accent' },
  { type: 'bullets' },
  { type: 'stats', variant: 'subtle' },
  { type: 'statement', variant: 'dark' },
];

function brandStyle(
  palette: Record<string, string>,
  font?: string
): React.CSSProperties {
  const s: Record<string, string> = {};
  if (palette.primary) {
    s['--primary'] = palette.primary;
    s['--brand-to'] = palette.primary;
    s['--brand-from'] = palette.secondary || palette.accent || palette.primary;
  }
  if (palette.background) s['--background'] = palette.background;
  if (palette.text) s['--foreground'] = palette.text;
  if (font) s.fontFamily = `${font}, system-ui, sans-serif`;
  return s as React.CSSProperties;
}

function BrandEditor({ brand }: { brand: BrandDTO }) {
  const qc = useQueryClient();
  const [name, setName] = useState(brand.name);
  const [tone, setTone] = useState(brand.tone ?? '');
  const [headingFont, setHeadingFont] = useState(
    brand.typography?.heading_font ?? ''
  );
  const [bodyFont, setBodyFont] = useState(brand.typography?.body_font ?? '');
  const [palette, setPalette] = useState<Record<string, string>>({
    primary: brand.palette?.primary ?? '#25a18e',
    secondary: brand.palette?.secondary ?? '#10b981',
    accent: brand.palette?.accent ?? '#f59e0b',
    background: brand.palette?.background ?? '#ffffff',
    text: brand.palette?.text ?? '#1a1a1a',
  });

  const save = useMutation({
    mutationFn: () =>
      apiPatch(`/api/brands/${brand.id}`, {
        name,
        palette,
        tone,
        typography: {
          ...(brand.typography ?? {}),
          heading_font: headingFont || undefined,
          body_font: bodyFont || undefined,
        },
      }),
    onSuccess: () => {
      toast.success(m['settings.brands.saved']());
      qc.invalidateQueries({ queryKey: ['brands'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const style = brandStyle(palette, bodyFont);

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/settings/brands"
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            ← {m['settings.brands.all_brands']()}
          </Link>
          <h1 className="text-xl font-bold">{name}</h1>
        </div>
        <Button
          size="sm"
          disabled={save.isPending}
          onClick={() => save.mutate()}
        >
          {m['settings.brands.save']()}
        </Button>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* 实时预览 */}
        <div className="min-w-0 flex-1 space-y-4">
          <p className="text-muted-foreground text-sm font-semibold">
            {m['settings.brands.live_preview']()}
          </p>
          {PREVIEW_SLIDES.map((s, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-xl border"
              style={style}
            >
              {renderSlide(s.type, {
                ...sampleSlideContent(s.type),
                ...(s.variant ? { variant: s.variant } : {}),
              })}
            </div>
          ))}
        </div>

        {/* 编辑 */}
        <div className="w-full shrink-0 space-y-4 lg:w-80">
          <div>
            <p className="text-muted-foreground mb-1 text-xs">
              {m['settings.brands.name']()}
            </p>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-2">
            {PALETTE_KEYS.map(([k, label]) => (
              <div key={k} className="flex items-center gap-3">
                <span className="text-muted-foreground w-20 text-sm">
                  {m[label]()}
                </span>
                <input
                  type="color"
                  value={palette[k]}
                  onChange={(e) =>
                    setPalette((p) => ({ ...p, [k]: e.target.value }))
                  }
                  className="h-8 w-14 rounded border"
                />
                <span className="text-muted-foreground text-xs">
                  {palette[k]}
                </span>
              </div>
            ))}
          </div>

          <div>
            <p className="text-muted-foreground mb-1 text-xs">
              {m['settings.brands.heading_font']()}
            </p>
            <Input
              placeholder="Inter"
              value={headingFont}
              onChange={(e) => setHeadingFont(e.target.value)}
            />
          </div>
          <div>
            <p className="text-muted-foreground mb-1 text-xs">
              {m['settings.brands.body_font']()}
            </p>
            <Input
              placeholder="Inter"
              value={bodyFont}
              onChange={(e) => setBodyFont(e.target.value)}
            />
          </div>

          <div>
            <p className="text-muted-foreground mb-1 text-xs">
              {m['settings.brands.tone_ph']()}
            </p>
            <Input value={tone} onChange={(e) => setTone(e.target.value)} />
          </div>
        </div>
      </div>
    </div>
  );
}

function BrandEditorPage() {
  const { id } = Route.useParams();
  const brandsQ = useQuery({
    queryKey: ['brands'],
    queryFn: () => apiGet<BrandDTO[]>('/api/brands'),
  });
  const brand = brandsQ.data?.find((b) => b.id === id);
  if (brandsQ.isLoading) return <div className="py-12 text-center">…</div>;
  if (!brand)
    return (
      <div className="py-12 text-center">
        {m['settings.brands.all_brands']()}
      </div>
    );
  return <BrandEditor key={brand.id} brand={brand} />;
}

export const Route = createFileRoute('/settings/brands/$id')({
  component: BrandEditorPage,
});
