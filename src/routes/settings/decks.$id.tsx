import { lazy, Suspense, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Play, Plus, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Link } from '@/core/i18n/navigation';
import { listSlideTemplates } from '@/modules/deck/templates/registry';
import { slideName, slideWhen } from '@/modules/deck/templates/zh';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { sampleSlideContent, SlideForm } from '@/components/deck/slide-form';
import { renderSlide } from '@/components/deck/slides';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

// 仅客户端懒加载。SSR 构建用 import.meta.env.SSR=true 把动态 import 作为死代码消除，
// 避免 4.7MB 的 Excalidraw 进入 Workers 服务端包（免费档 3MiB 上限）。
const ExcalidrawCanvas = lazy(
  () =>
    (import.meta.env.SSR
      ? Promise.resolve({ default: () => null })
      : import('@/components/deck/excalidraw-canvas')) as Promise<{
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      default: React.ComponentType<any>;
    }>
);

interface SlideDTO {
  id: string;
  slide_type: string;
  order: number;
  content: Record<string, unknown>;
}
interface DeckDTO {
  id: string;
  title: string;
  slug: string;
  status: string;
  url: string | null;
  brand_id: string | null;
  slides: SlideDTO[];
}
interface BrandLite {
  id: string;
  name: string;
  palette: Record<string, string> | null;
  typography: Record<string, string> | null;
  logo_url: string | null;
}

function brandStyle(
  palette?: Record<string, string> | null,
  typography?: Record<string, string> | null,
  logoUrl?: string | null
): React.CSSProperties {
  const s: Record<string, string> = {};
  if (palette?.primary) {
    s['--primary'] = palette.primary;
    s['--brand-to'] = palette.primary;
    s['--brand-from'] = palette.secondary || palette.accent || palette.primary;
  }
  if (palette?.background) s['--background'] = palette.background;
  if (palette?.text) s['--foreground'] = palette.text;
  if (typography?.body_font) s['--body-font'] = typography.body_font;
  if (typography?.heading_font) s['--heading-font'] = typography.heading_font;
  if (logoUrl) s['--brand-logo'] = `url("${logoUrl}")`;
  return s as React.CSSProperties;
}

function SlideEditor({
  deckId,
  slide,
  previewStyle,
  onInsertBelow,
}: {
  deckId: string;
  slide: SlideDTO;
  previewStyle?: React.CSSProperties;
  onInsertBelow?: () => void;
}) {
  const qc = useQueryClient();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slide.id });
  const [content, setContent] = useState<Record<string, unknown>>(
    slide.content
  );
  const [instruction, setInstruction] = useState('');
  const [showJson, setShowJson] = useState(false);
  const [canvasOpen, setCanvasOpen] = useState(false);
  const isCanvas = slide.slide_type === 'canvas';
  const [jsonDraft, setJsonDraft] = useState(() =>
    JSON.stringify(slide.content, null, 2)
  );
  let jsonError = false;
  try {
    JSON.parse(jsonDraft);
  } catch {
    jsonError = true;
  }

  const save = useMutation({
    mutationFn: (cnt?: Record<string, unknown>) =>
      apiPatch(`/api/decks/${deckId}/slides/${slide.id}`, {
        content: cnt ?? content,
      }),
    onSuccess: () => {
      toast.success(m['settings.deck_editor.saved']());
      qc.invalidateQueries({ queryKey: ['deck', deckId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: () => apiDelete(`/api/decks/${deckId}/slides/${slide.id}`),
    onSuccess: () => {
      toast.success(m['settings.deck_editor.deleted']());
      qc.invalidateQueries({ queryKey: ['deck', deckId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const iterate = useMutation({
    mutationFn: () =>
      apiPost<{ content: Record<string, unknown> }>(
        `/api/decks/${deckId}/slides/${slide.id}/iterate`,
        { instruction }
      ),
    onSuccess: (s) => {
      setContent(s.content);
      setJsonDraft(JSON.stringify(s.content, null, 2));
      setInstruction('');
      toast.success(m['settings.deck_editor.ai_iterated']());
      qc.invalidateQueries({ queryKey: ['deck', deckId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && 'opacity-60 shadow-lg')}
    >
      <CardContent className="space-y-3 py-4">
        <div className="flex items-center gap-2">
          <button
            className="text-muted-foreground hover:text-foreground cursor-grab"
            {...attributes}
            {...listeners}
            aria-label="reorder"
          >
            <GripVertical className="size-4" />
          </button>
          <Badge variant="secondary">{slide.slide_type}</Badge>
          <span className="text-muted-foreground text-xs">#{slide.order}</span>
          <button
            className="text-muted-foreground hover:text-destructive ml-auto"
            onClick={() => del.mutate()}
            aria-label="delete"
          >
            <Trash2 className="size-4" />
          </button>
        </div>

        {/* 实时预览（由表单内容驱动，套用所选品牌色） */}
        <div
          className="deck-fonts overflow-hidden rounded-xl border"
          style={previewStyle}
        >
          {renderSlide(slide.slide_type, content)}
        </div>

        {isCanvas ? (
          /* 画布页：编辑画布按钮（全屏 Excalidraw） */
          <>
            <Button
              variant="secondary"
              className="gap-1"
              onClick={() => setCanvasOpen(true)}
            >
              {m['settings.deck_editor.edit_canvas']()}
            </Button>
            {canvasOpen && (
              <Suspense fallback={null}>
                <ExcalidrawCanvas
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  initial={(content.scene as any) ?? null}
                  onClose={() => setCanvasOpen(false)}
                  onSave={({
                    scene,
                    svg,
                    png,
                  }: {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    scene: any;
                    svg: string;
                    png: string;
                  }) => {
                    const nc = { ...content, scene, svg, png };
                    setContent(nc);
                    setJsonDraft(JSON.stringify({ scene: '…' }, null, 2));
                    save.mutate(nc);
                    setCanvasOpen(false);
                  }}
                />
              </Suspense>
            )}
          </>
        ) : (
          <>
            {/* 单页 AI 改写 */}
            <div className="flex items-center gap-2">
              <Input
                placeholder={m['settings.deck_editor.ai_iterate_ph']()}
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                onKeyDown={(e) => {
                  if (
                    e.key === 'Enter' &&
                    instruction.trim() &&
                    !iterate.isPending
                  )
                    iterate.mutate();
                }}
              />
              <Button
                size="sm"
                variant="secondary"
                className="shrink-0 gap-1"
                disabled={!instruction.trim() || iterate.isPending}
                onClick={() => iterate.mutate()}
              >
                <Sparkles className="size-4" />
                {iterate.isPending
                  ? m['settings.deck_editor.ai_iterating']()
                  : m['settings.deck_editor.ai_iterate_btn']()}
              </Button>
            </div>

            {/* 表单式编辑 */}
            <SlideForm
              slideType={slide.slide_type}
              content={content}
              onChange={setContent}
            />
          </>
        )}

        {/* 高级：原始 JSON */}
        <div>
          <button
            className="text-muted-foreground hover:text-foreground text-xs"
            onClick={() => {
              if (!showJson) setJsonDraft(JSON.stringify(content, null, 2));
              setShowJson((v) => !v);
            }}
          >
            {showJson ? '▾ ' : '▸ '}
            {m['settings.deck_editor.advanced_json']()}
          </button>
          {showJson && (
            <div className="mt-2 space-y-2">
              <Textarea
                rows={8}
                className="font-mono text-xs"
                value={jsonDraft}
                onChange={(e) => setJsonDraft(e.target.value)}
              />
              <Button
                size="sm"
                variant="outline"
                disabled={jsonError}
                onClick={() => setContent(JSON.parse(jsonDraft))}
              >
                {m['settings.deck_editor.apply_json']()}
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          {onInsertBelow ? (
            <button
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
              onClick={onInsertBelow}
            >
              <Plus className="size-3.5" />
              {m['settings.deck_editor.insert_below']()}
            </button>
          ) : (
            <span />
          )}
          <Button
            size="sm"
            disabled={save.isPending}
            onClick={() => save.mutate(undefined)}
          >
            {m['settings.deck_editor.save']()}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DeckEditorPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const sensors = useSensors(useSensor(PointerSensor));
  const [order, setOrder] = useState<string[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [addQ, setAddQ] = useState('');
  const [addAt, setAddAt] = useState<number | undefined>(undefined);

  const deckQ = useQuery({
    queryKey: ['deck', id],
    queryFn: () => apiGet<DeckDTO>(`/api/decks/${id}`),
  });
  const brandsQ = useQuery({
    queryKey: ['brands'],
    queryFn: () => apiGet<BrandLite[]>('/api/brands'),
  });
  const setBrand = useMutation({
    mutationFn: (brandId: string | null) =>
      apiPatch(`/api/decks/${id}`, { brand_id: brandId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deck', id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    if (deckQ.data) setOrder(deckQ.data.slides.map((s) => s.id));
  }, [deckQ.data]);

  const reorder = useMutation({
    mutationFn: (ids: string[]) =>
      apiPost(`/api/decks/${id}/slides/reorder`, { ordered_slide_ids: ids }),
    onError: (e: Error) => toast.error(e.message),
  });
  const addSlide = useMutation({
    mutationFn: (slideType: string) =>
      apiPost(`/api/decks/${id}/slides`, {
        slide_type: slideType,
        content: {},
        index: addAt,
      }),
    onSuccess: () => {
      setAddOpen(false);
      setAddAt(undefined);
      qc.invalidateQueries({ queryKey: ['deck', id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const publish = useMutation({
    mutationFn: (to: 'publish' | 'unpublish') =>
      apiPost(`/api/decks/${id}/${to}`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deck', id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const deck = deckQ.data;
  if (deckQ.isError)
    return (
      <div className="py-12 text-center">
        {m['settings.deck_editor.not_found']()}
      </div>
    );
  if (!deck) return <div className="py-12 text-center">…</div>;

  const slideById = new Map(deck.slides.map((s) => [s.id, s]));
  const ordered = order
    .map((sid) => slideById.get(sid))
    .filter(Boolean) as SlideDTO[];
  const currentBrand = brandsQ.data?.find((b) => b.id === deck.brand_id);
  const previewStyle = brandStyle(
    currentBrand?.palette,
    currentBrand?.typography,
    currentBrand?.logo_url
  );

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldI = order.indexOf(String(active.id));
    const newI = order.indexOf(String(over.id));
    const next = arrayMove(order, oldI, newI);
    setOrder(next);
    reorder.mutate(next);
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/settings/decks"
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            ← {m['settings.deck_editor.back']()}
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="truncate text-xl font-bold">{deck.title}</h1>
            <Badge
              variant={deck.status === 'published' ? 'default' : 'secondary'}
            >
              {deck.status === 'published'
                ? m['settings.decks.published']()
                : m['settings.decks.draft']()}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={currentBrand ? deck.brand_id! : ''}
            onValueChange={(v) => setBrand.mutate(v || null)}
          >
            <SelectTrigger className="h-8 w-40">
              <SelectValue placeholder={m['settings.deck_editor.brand']()}>
                {(val: unknown) =>
                  brandsQ.data?.find((b) => b.id === val)?.name ??
                  m['settings.deck_editor.brand_none']()
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">
                {m['settings.deck_editor.brand_none']()}
              </SelectItem>
              {brandsQ.data?.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Link
            href={`/present/${id}`}
            className={cn(buttonVariants({ size: 'sm' }), 'gap-1')}
          >
            <Play className="size-4" />
            {m['settings.deck_editor.present']()}
          </Link>
          <a
            href={`/api/decks/${id}/export?format=pptx`}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
          >
            {m['settings.deck_editor.export_pptx']()}
          </a>
          {deck.status === 'published' && (
            <a
              href={`/api/decks/${id}/export?format=pdf`}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              {m['settings.deck_editor.export_pdf']()}
            </a>
          )}
          {deck.url && (
            <a
              href={deck.url}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              {m['settings.deck_editor.live']()}
            </a>
          )}
          {deck.status === 'published' ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => publish.mutate('unpublish')}
            >
              {m['settings.deck_editor.unpublish']()}
            </Button>
          ) : (
            <Button size="sm" onClick={() => publish.mutate('publish')}>
              {m['settings.deck_editor.publish']()}
            </Button>
          )}
        </div>
      </div>

      <p className="text-muted-foreground text-xs">
        {m['settings.deck_editor.reorder_hint']()}
      </p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {ordered.map((s, idx) => (
              <SlideEditor
                key={s.id}
                deckId={id}
                slide={s}
                previewStyle={previewStyle}
                onInsertBelow={() => {
                  setAddAt(idx + 1);
                  setAddQ('');
                  setAddOpen(true);
                }}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* 新增页：缩略图挑选器 */}
      <Button
        variant="outline"
        className="gap-1"
        onClick={() => {
          setAddAt(undefined);
          setAddQ('');
          setAddOpen(true);
        }}
      >
        <Plus className="size-4" />
        {m['settings.deck_editor.add']()}
      </Button>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[92vh] w-[94vw] overflow-hidden sm:max-w-[1500px]">
          <DialogHeader>
            <DialogTitle>{m['settings.deck_editor.add']()}</DialogTitle>
          </DialogHeader>
          <SlidePicker
            query={addQ}
            setQuery={setAddQ}
            pending={addSlide.isPending}
            onPick={(key) => addSlide.mutate(key)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SlidePicker({
  query,
  setQuery,
  pending,
  onPick,
}: {
  query: string;
  setQuery: (v: string) => void;
  pending: boolean;
  onPick: (key: string) => void;
}) {
  const zh = getLocale() === 'zh';
  const cats: [string, string, string][] = [
    ['Open', '开场', 'Open'],
    ['Argue', '论证', 'Argue'],
    ['Show', '展示', 'Show'],
    ['Close', '收尾', 'Close'],
  ];
  const all = listSlideTemplates();
  const s = query.trim().toLowerCase();
  const list = s
    ? all.filter(
        (t) =>
          t.key.toLowerCase().includes(s) ||
          t.name.toLowerCase().includes(s) ||
          t.whenToUse.toLowerCase().includes(s) ||
          slideName(t.key, t.name, true).toLowerCase().includes(s) ||
          slideWhen(t.key, t.whenToUse, true).toLowerCase().includes(s)
      )
    : all;
  const [sel, setSel] = useState(all[0]?.key ?? '');
  // 当前选中（搜索后若选中项不在结果里，回退到首个结果）
  const current = list.find((t) => t.key === sel) ?? list[0];

  return (
    <div className="flex h-[78vh] gap-5">
      {/* 左：紧凑列表（约 1/5） */}
      <div className="flex w-52 shrink-0 flex-col gap-2">
        <Input
          placeholder={m['settings.library.search']()}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="-mr-1 space-y-3 overflow-auto pr-1">
          {cats.map(([cat, zhL, enL]) => {
            const items = list.filter((t) => t.category === cat);
            if (!items.length) return null;
            return (
              <div key={cat}>
                <p className="text-muted-foreground mb-1 text-xs font-semibold">
                  {zh ? zhL : enL}
                </p>
                {items.map((t) => (
                  <button
                    key={t.key}
                    onMouseEnter={() => setSel(t.key)}
                    onClick={() => setSel(t.key)}
                    onDoubleClick={() => !pending && onPick(t.key)}
                    className={cn(
                      'block w-full rounded-md px-2 py-1.5 text-left text-sm transition',
                      current?.key === t.key
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    )}
                  >
                    {slideName(t.key, t.name, zh)}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* 右：大预览 */}
      {current && (
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="bg-muted/30 flex flex-1 items-center justify-center overflow-auto rounded-xl border p-4">
            <div className="w-full">
              {renderSlide(current.key, sampleSlideContent(current.key))}
            </div>
          </div>
          <div className="mt-3 flex items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="font-semibold">
                {slideName(current.key, current.name, zh)}
              </p>
              <p className="text-muted-foreground text-xs">
                {slideWhen(current.key, current.whenToUse, zh)}
              </p>
            </div>
            <Button
              className="shrink-0 gap-1"
              disabled={pending}
              onClick={() => onPick(current.key)}
            >
              <Plus className="size-4" />
              {m['settings.deck_editor.add']()}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute('/settings/decks/$id')({
  component: DeckEditorPage,
});
