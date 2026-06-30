import { useEffect, useState } from 'react';
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
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { SlideForm } from '@/components/deck/slide-form';
import { renderSlide } from '@/components/deck/slides';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

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
interface TemplateDTO {
  key: string;
  name: string;
  category: string;
}
interface BrandLite {
  id: string;
  name: string;
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

function SlideEditor({
  deckId,
  slide,
  previewStyle,
}: {
  deckId: string;
  slide: SlideDTO;
  previewStyle?: React.CSSProperties;
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
    mutationFn: () =>
      apiPatch(`/api/decks/${deckId}/slides/${slide.id}`, { content }),
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
        <div className="overflow-hidden rounded-xl border" style={previewStyle}>
          {renderSlide(slide.slide_type, content)}
        </div>

        {/* 单页 AI 改写 */}
        <div className="flex items-center gap-2">
          <Input
            placeholder={m['settings.deck_editor.ai_iterate_ph']()}
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && instruction.trim() && !iterate.isPending)
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

        <div className="flex justify-end">
          <Button
            size="sm"
            disabled={save.isPending}
            onClick={() => save.mutate()}
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
  const [addType, setAddType] = useState('');

  const deckQ = useQuery({
    queryKey: ['deck', id],
    queryFn: () => apiGet<DeckDTO>(`/api/decks/${id}`),
  });
  const tplQ = useQuery({
    queryKey: ['slide-templates'],
    queryFn: () => apiGet<TemplateDTO[]>('/api/slide-templates'),
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
    mutationFn: () =>
      apiPost(`/api/decks/${id}/slides`, { slide_type: addType, content: {} }),
    onSuccess: () => {
      setAddType('');
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
  const previewStyle = brandStyle(currentBrand?.palette);

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
            {ordered.map((s) => (
              <SlideEditor
                key={s.id}
                deckId={id}
                slide={s}
                previewStyle={previewStyle}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* 新增页 */}
      <div className="flex items-center gap-2">
        <Select value={addType} onValueChange={(v) => setAddType(v ?? '')}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="slide_type">
              {(val: unknown) => {
                const t = tplQ.data?.find((x) => x.key === val);
                return t ? `${t.name} (${t.category})` : 'slide_type';
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {tplQ.data?.map((t) => (
              <SelectItem key={t.key} value={t.key}>
                {t.name} ({t.category})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          className="gap-1"
          disabled={!addType || addSlide.isPending}
          onClick={() => addSlide.mutate()}
        >
          <Plus className="size-4" />
          {m['settings.deck_editor.add']()}
        </Button>
      </div>
    </div>
  );
}

export const Route = createFileRoute('/settings/decks/$id')({
  component: DeckEditorPage,
});
