import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { apiDelete, apiGet, apiPost } from '@/lib/api-client';
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
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Brand {
  id: string;
  name: string;
  palette: Record<string, string> | null;
  tone: string | null;
  source_url: string | null;
  is_active: boolean;
}

function BrandsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [primary, setPrimary] = useState('#25a18e');
  const [tone, setTone] = useState('');

  const list = useQuery({
    queryKey: ['brands'],
    queryFn: () => apiGet<Brand[]>('/api/brands'),
  });
  const done = () => {
    setOpen(false);
    setUrl('');
    setName('');
    setTone('');
    qc.invalidateQueries({ queryKey: ['brands'] });
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['brands'] }),
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/brands/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['brands'] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
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
                  <label className="text-sm">
                    {m['settings.brands.primary']()}
                  </label>
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

      <div className="grid gap-3">
        {list.data?.map((b) => (
          <Card key={b.id}>
            <CardContent className="flex items-center gap-4 py-4">
              <span
                className="size-10 shrink-0 rounded-lg border"
                style={{ background: b.palette?.primary ?? '#ccc' }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{b.name}</span>
                  {b.is_active && (
                    <Badge>{m['settings.brands.active']()}</Badge>
                  )}
                </div>
                <div className="text-muted-foreground truncate text-xs">
                  {b.tone || b.source_url || b.palette?.primary}
                </div>
              </div>
              {!b.is_active && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActive.mutate(b.id)}
                >
                  {m['settings.brands.set_active']()}
                </Button>
              )}
              <button
                className="text-muted-foreground hover:text-destructive"
                onClick={() => del.mutate(b.id)}
                aria-label="delete"
              >
                <Trash2 className="size-4" />
              </button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export const Route = createFileRoute('/settings/brands')({
  component: BrandsPage,
});
