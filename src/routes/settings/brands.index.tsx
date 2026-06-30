import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { MoreHorizontal, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { Link } from '@/core/i18n/navigation';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api-client';
import { m } from '@/paraglide/messages.js';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Brand {
  id: string;
  name: string;
  palette: Record<string, string> | null;
  typography: Record<string, string> | null;
  tone: string | null;
  source_url: string | null;
  is_active: boolean;
}

const PALETTE_KEYS = [
  ['primary', 'settings.brands.primary'],
  ['secondary', 'settings.brands.secondary'],
  ['accent', 'settings.brands.accent'],
  ['background', 'settings.brands.background'],
  ['text', 'settings.brands.text'],
] as const;

function shade(hex: string, amt: number): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const f = (c: number) =>
    Math.max(
      0,
      Math.min(255, Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt))
    );
  return (
    '#' +
    [f(r), f(g), f(b)].map((x) => x.toString(16).padStart(2, '0')).join('')
  );
}

function SwatchStrip({ palette }: { palette: Record<string, string> | null }) {
  const p = palette ?? {};
  const primary = p.primary || '#cccccc';
  // 生成色阶：背景 → 主色 → 深主色 → 文字 → 浅主色（仿 heydecks 的色阶条）
  const colors = [
    p.background || '#ffffff',
    primary,
    shade(primary, -0.4),
    p.text || '#111111',
    shade(primary, 0.82),
  ];
  return (
    <div className="flex h-20 w-full">
      {colors.map((c, i) => (
        <div key={i} className="flex-1" style={{ background: c }} />
      ))}
    </div>
  );
}

function EditBrandDialog({
  brand,
  onClose,
}: {
  brand: Brand;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(brand.name);
  const [tone, setTone] = useState(brand.tone ?? '');
  const [palette, setPalette] = useState<Record<string, string>>({
    primary: brand.palette?.primary ?? '#25a18e',
    secondary: brand.palette?.secondary ?? '#10b981',
    accent: brand.palette?.accent ?? '#f59e0b',
    background: brand.palette?.background ?? '#ffffff',
    text: brand.palette?.text ?? '#1a1a1a',
  });

  const save = useMutation({
    mutationFn: () =>
      apiPatch(`/api/brands/${brand.id}`, { name, palette, tone }),
    onSuccess: () => {
      toast.success(m['settings.brands.saved']());
      qc.invalidateQueries({ queryKey: ['brands'] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m['settings.brands.edit_title']()}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
          <div className="grid grid-cols-1 gap-2">
            {PALETTE_KEYS.map(([k, label]) => (
              <div key={k} className="flex items-center gap-3">
                <span className="text-muted-foreground w-24 text-sm">
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
          <Input
            placeholder={m['settings.brands.tone_ph']()}
            value={tone}
            onChange={(e) => setTone(e.target.value)}
          />
          <Button
            className="w-full"
            disabled={save.isPending}
            onClick={() => save.mutate()}
          >
            {m['settings.brands.save']()}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BrandsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [primary, setPrimary] = useState('#25a18e');
  const [tone, setTone] = useState('');

  const list = useQuery({
    queryKey: ['brands'],
    queryFn: () => apiGet<Brand[]>('/api/brands'),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['brands'] });
  const done = () => {
    setOpen(false);
    setUrl('');
    setName('');
    setTone('');
    refresh();
  };
  const extract = useMutation({
    mutationFn: () => apiPost('/api/brands/extract', { url }),
    onSuccess: done,
    onError: (e: Error) => toast.error(e.message),
  });
  const create = useMutation({
    mutationFn: () =>
      apiPost('/api/brands', {
        name,
        palette: { primary, background: '#ffffff', text: '#1a1a1a' },
        tone: tone || undefined,
      }),
    onSuccess: done,
    onError: (e: Error) => toast.error(e.message),
  });
  const setActive = useMutation({
    mutationFn: (id: string) =>
      apiPost('/api/brands/set-active', { brand_id: id }),
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/brands/${id}`),
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });
  const duplicate = useMutation({
    mutationFn: (b: Brand) =>
      apiPost('/api/brands', {
        name: `${b.name} copy`,
        palette: b.palette,
        typography: b.typography,
        tone: b.tone,
      }),
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  function exportJson(b: Brand) {
    const blob = new Blob([JSON.stringify(b, null, 2)], {
      type: 'application/json',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${b.name}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{m['settings.brands.title']()}</h1>
          <p className="text-muted-foreground text-sm">
            {m['settings.brands.subtitle']()}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center rounded-md px-4 text-sm font-medium">
            {m['settings.brands.new']()}
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{m['settings.brands.new']()}</DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="url">
              <TabsList className="w-full">
                <TabsTrigger value="url" className="flex-1">
                  {m['settings.brands.extract']()}
                </TabsTrigger>
                <TabsTrigger value="manual" className="flex-1">
                  {m['settings.brands.new']()}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="url" className="space-y-3 pt-3">
                <Input
                  placeholder={m['settings.brands.url_ph']()}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
                <Button
                  className="w-full gap-2"
                  disabled={!url.trim() || extract.isPending}
                  onClick={() => extract.mutate()}
                >
                  <Sparkles className="size-4" />
                  {extract.isPending
                    ? m['settings.brands.extracting']()
                    : m['settings.brands.extract']()}
                </Button>
              </TabsContent>
              <TabsContent value="manual" className="space-y-3 pt-3">
                <Input
                  placeholder={m['settings.brands.name_ph']()}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <div className="flex items-center gap-2">
                  <span className="text-sm">
                    {m['settings.brands.primary']()}
                  </span>
                  <input
                    type="color"
                    value={primary}
                    onChange={(e) => setPrimary(e.target.value)}
                    className="h-9 w-16 rounded border"
                  />
                  <span className="text-muted-foreground text-xs">
                    {primary}
                  </span>
                </div>
                <Input
                  placeholder={m['settings.brands.tone_ph']()}
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                />
                <Button
                  className="w-full"
                  disabled={!name.trim() || create.isPending}
                  onClick={() => create.mutate()}
                >
                  {m['settings.brands.create']()}
                </Button>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {list.data && list.data.length === 0 && (
        <Card>
          <CardContent className="text-muted-foreground py-12 text-center">
            {m['settings.brands.empty']()}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-4">
        {list.data?.map((b) => (
          <Card key={b.id} className="w-full overflow-hidden p-0 sm:w-[340px]">
            <SwatchStrip palette={b.palette} />
            <div className="flex items-center gap-3 p-3">
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-md border text-sm font-semibold"
                style={{
                  background: b.palette?.primary || '#f3f3f3',
                  color: b.palette?.primary ? '#fff' : 'inherit',
                }}
              >
                {b.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <Link
                    href={`/settings/brands/${b.id}`}
                    className="hover:text-primary truncate font-medium"
                  >
                    {b.name}
                  </Link>
                  {b.is_active && (
                    <span className="bg-primary size-1.5 shrink-0 rounded-full" />
                  )}
                </div>
                <div className="text-muted-foreground truncate text-xs">
                  {b.typography?.heading_font || 'Inter'}
                  {b.tone ? ` · ${b.tone}` : ''}
                </div>
              </div>
              {!b.is_active && (
                <button
                  className="text-muted-foreground hover:text-foreground shrink-0 text-sm"
                  onClick={() => setActive.mutate(b.id)}
                >
                  {m['settings.brands.set_active']()}
                </button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger className="text-muted-foreground hover:text-foreground inline-flex size-8 shrink-0 items-center justify-center rounded-md">
                  <MoreHorizontal className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditing(b)}>
                    {m['settings.brands.edit']()}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => duplicate.mutate(b)}>
                    {m['settings.brands.duplicate']()}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportJson(b)}>
                    {m['settings.brands.export']()}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => del.mutate(b.id)}
                  >
                    {m['settings.brands.delete']()}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </Card>
        ))}
      </div>

      {editing && (
        <EditBrandDialog brand={editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

export const Route = createFileRoute('/settings/brands/')({
  component: BrandsPage,
});
