import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Plus, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { Link, useRouter } from '@/core/i18n/navigation';
import { apiDelete, apiGet, apiPost } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { renderSlide } from '@/components/deck/slides';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

interface DeckRow {
  id: string;
  title: string;
  slug: string;
  status: string;
  url: string | null;
  updated_at: string;
  cover: { slideType: string; content: Record<string, unknown> } | null;
  views: number;
}

const DESIGN_W = 1280;

/** 把首页按设计宽度渲染后等比缩放填满卡片顶部（保持 16:9，字迹清晰）。 */
function DeckThumb({ cover }: { cover: DeckRow['cover'] }) {
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
      className="bg-muted relative w-full overflow-hidden"
      style={{ aspectRatio: '16 / 9' }}
    >
      {cover ? (
        <div
          className="absolute top-0 left-0"
          style={{
            width: DESIGN_W,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          {renderSlide(cover.slideType, cover.content)}
        </div>
      ) : (
        <div className="text-muted-foreground flex h-full items-center justify-center text-xs">
          {m['settings.decks.no_slides']()}
        </div>
      )}
    </div>
  );
}

function DecksPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [reading, setReading] = useState(false);
  const [delTarget, setDelTarget] = useState<DeckRow | null>(null);

  const list = useQuery({
    queryKey: ['decks'],
    queryFn: () => apiGet<DeckRow[]>('/api/decks'),
  });

  const del = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/decks/${id}`),
    onSuccess: () => {
      toast.success(m['settings.decks.deleted']());
      setDelTarget(null);
      qc.invalidateQueries({ queryKey: ['decks'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const gen = useMutation({
    mutationFn: () =>
      apiPost<{ deck_id: string }>('/api/decks/generate', {
        input: input || undefined,
        url: url || undefined,
        title,
      }),
    onSuccess: (d) => {
      setOpen(false);
      setInput('');
      setUrl('');
      setTitle('');
      qc.invalidateQueries({ queryKey: ['decks'] });
      router.push(`/settings/decks/${d.deck_id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const importRef = useRef<HTMLInputElement>(null);
  const importDeck = useMutation({
    mutationFn: (payload: unknown) =>
      apiPost<{ deck_id: string; imported: number; skipped: unknown[] }>(
        '/api/decks/import',
        payload
      ),
    onSuccess: (d) => {
      const skipped = d.skipped?.length ?? 0;
      if (skipped > 0) {
        toast.warning(
          m['settings.decks.import_partial']({
            imported: d.imported,
            skipped,
          })
        );
      } else {
        toast.success(m['settings.decks.import_ok']({ imported: d.imported }));
      }
      qc.invalidateQueries({ queryKey: ['decks'] });
      router.push(`/settings/decks/${d.deck_id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = ''; // 允许重复选同一文件
    if (!f) return;
    try {
      const json = JSON.parse(await f.text());
      importDeck.mutate(json);
    } catch {
      toast.error(m['settings.decks.import_bad_file']());
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setReading(true);
    try {
      const text = await f.text();
      setInput(text.slice(0, 8000));
    } catch {
      toast.error('read file failed');
    } finally {
      setReading(false);
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{m['settings.decks.title']()}</h1>
          <p className="text-muted-foreground text-sm">
            {m['settings.decks.subtitle']()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={importRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleImportFile}
          />
          <Button
            variant="outline"
            className="gap-2"
            disabled={importDeck.isPending}
            onClick={() => importRef.current?.click()}
          >
            <Upload className="size-4" />
            {importDeck.isPending
              ? m['settings.decks.importing']()
              : m['settings.decks.import']()}
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger className={cn(buttonVariants(), 'gap-2')}>
              <Plus className="size-4" />
              {m['settings.decks.generate']()}
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{m['settings.decks.gen_title']()}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Input
                  placeholder={m['settings.decks.title_ph']()}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <Tabs defaultValue="text">
                  <TabsList className="w-full">
                    <TabsTrigger value="text" className="flex-1">
                      {m['settings.decks.tab_text']()}
                    </TabsTrigger>
                    <TabsTrigger value="url" className="flex-1">
                      {m['settings.decks.tab_url']()}
                    </TabsTrigger>
                    <TabsTrigger value="file" className="flex-1">
                      {m['settings.decks.tab_file']()}
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="text" className="pt-3">
                    <Textarea
                      rows={6}
                      placeholder={m['settings.decks.input_ph']()}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                    />
                  </TabsContent>
                  <TabsContent value="url" className="pt-3">
                    <Input
                      placeholder={m['settings.decks.url_ph']()}
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                    />
                  </TabsContent>
                  <TabsContent value="file" className="space-y-2 pt-3">
                    <input
                      type="file"
                      accept=".txt,.md,text/plain,text/markdown"
                      onChange={handleFile}
                      className="text-sm"
                    />
                    <p className="text-muted-foreground text-xs">
                      {reading
                        ? m['settings.decks.reading_file']()
                        : input
                          ? `✓ ${input.length} chars`
                          : m['settings.decks.file_hint']()}
                    </p>
                  </TabsContent>
                </Tabs>
              </div>
              <DialogFooter>
                <Button
                  disabled={
                    (!input.trim() && !url.trim()) || reading || gen.isPending
                  }
                  onClick={() => gen.mutate()}
                >
                  {gen.isPending
                    ? m['settings.decks.generating']()
                    : m['settings.decks.generate']()}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {list.data && list.data.length === 0 && (
        <Card>
          <CardContent className="text-muted-foreground py-12 text-center">
            {m['settings.decks.empty']()}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.data?.map((d) => (
          <Card key={d.id} className="overflow-hidden py-0">
            <Link href={`/settings/decks/${d.id}`} className="block">
              <DeckThumb cover={d.cover} />
            </Link>
            <CardContent className="space-y-3 p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/settings/decks/${d.id}`}
                    className="hover:text-primary truncate font-medium transition-colors"
                  >
                    {d.title}
                  </Link>
                  <Badge
                    variant={d.status === 'published' ? 'default' : 'secondary'}
                    className="shrink-0"
                  >
                    {d.status === 'published'
                      ? m['settings.decks.published']()
                      : m['settings.decks.draft']()}
                  </Badge>
                </div>
                <div className="text-muted-foreground flex items-center gap-2 text-xs">
                  <span className="truncate">{d.slug}</span>
                  {d.status === 'published' && (
                    <span className="shrink-0">
                      · {d.views} {m['settings.deck_stats.views']()}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/settings/decks/${d.id}`}
                  className={cn(buttonVariants({ size: 'sm' }), 'flex-1')}
                >
                  {m['settings.decks.edit']()}
                </Link>
                <Link
                  href={`/present/${d.id}`}
                  className={cn(
                    buttonVariants({ variant: 'outline', size: 'sm' })
                  )}
                >
                  {m['settings.deck_editor.present']()}
                </Link>
                {d.url && (
                  <a
                    href={d.url}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(
                      buttonVariants({ variant: 'outline', size: 'sm' })
                    )}
                  >
                    {m['settings.decks.view']()}
                  </a>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive shrink-0"
                  aria-label={m['settings.decks.delete']()}
                  onClick={() => setDelTarget(d)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!delTarget} onOpenChange={(o) => !o && setDelTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{m['settings.decks.delete_title']()}</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            {m['settings.decks.delete_desc']({ title: delTarget?.title ?? '' })}
          </p>
          {delTarget?.status === 'published' && (
            <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm">
              <p>{m['settings.decks.delete_published_warn']()}</p>
              {delTarget.url && (
                <p className="mt-1 truncate font-mono text-xs opacity-80">
                  {delTarget.url}
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDelTarget(null)}>
              {m['settings.decks.cancel']()}
            </Button>
            <Button
              variant="destructive"
              disabled={del.isPending}
              onClick={() => delTarget && del.mutate(delTarget.id)}
            >
              {del.isPending
                ? m['settings.decks.deleting']()
                : m['settings.decks.delete']()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const Route = createFileRoute('/settings/decks/')({
  component: DecksPage,
});
