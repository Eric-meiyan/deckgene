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
import { apiDelete, apiGet, apiPost } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
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
  slides: SlideDTO[];
}
interface TemplateDTO {
  key: string;
  name: string;
  category: string;
}

function SlideEditor({ deckId, slide }: { deckId: string; slide: SlideDTO }) {
  const qc = useQueryClient();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slide.id });
  const [json, setJson] = useState(JSON.stringify(slide.content, null, 2));
  const [instruction, setInstruction] = useState('');

  // 实时预览：解析当前 JSON，合法则渲染，否则提示
  let parsed: Record<string, unknown> | null = null;
  let parseError = false;
  try {
    parsed = JSON.parse(json);
  } catch {
    parseError = true;
  }

  const save = useMutation({
    mutationFn: () =>
      apiPost(`/api/decks/${deckId}/slides/${slide.id}`, { content: parsed }),
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
      setJson(JSON.stringify(s.content, null, 2));
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

        {/* 实时预览 */}
        <div className="overflow-hidden rounded-xl border">
          {parseError || !parsed ? (
            <div className="text-muted-foreground p-4 text-xs">
              {m['settings.deck_editor.invalid_json']()}
            </div>
          ) : (
            renderSlide(slide.slide_type, parsed)
          )}
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

        {/* JSON 编辑 */}
        <Textarea
          rows={8}
          className="font-mono text-xs"
          value={json}
          onChange={(e) => setJson(e.target.value)}
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            disabled={parseError || save.isPending}
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
              <SlideEditor key={s.id} deckId={id} slide={s} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* 新增页 */}
      <div className="flex items-center gap-2">
        <Select value={addType} onValueChange={(v) => setAddType(v ?? '')}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="slide_type" />
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
