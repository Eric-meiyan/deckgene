import { lazy, Suspense, useEffect, useReducer, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useBlocker } from '@tanstack/react-router';
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
import {
  GripVertical,
  PanelRightClose,
  PanelRightOpen,
  Play,
  Plus,
  Redo2,
  Sparkles,
  Trash2,
  Undo2,
} from 'lucide-react';
import { toast } from 'sonner';

import { Link } from '@/core/i18n/navigation';
import {
  getSlideTemplate,
  listSlideTemplates,
} from '@/modules/deck/templates/registry';
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
  DialogFooter,
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

/** 中间栏：一张幻灯片的紧凑预览卡（可拖拽排序 / 点选 / 删除 / 下方插入）。 */
function SlidePreviewCard({
  slide,
  index,
  content,
  previewStyle,
  selected,
  onSelect,
  onInsertBelow,
  onDelete,
}: {
  slide: SlideDTO;
  index: number;
  content: Record<string, unknown>;
  previewStyle?: React.CSSProperties;
  selected: boolean;
  onSelect: () => void;
  onInsertBelow?: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slide.id });
  return (
    <Card
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onClick={onSelect}
      className={cn(
        'cursor-pointer transition',
        isDragging && 'opacity-60 shadow-lg',
        selected ? 'ring-primary ring-2' : 'hover:ring-border hover:ring-1'
      )}
    >
      <CardContent className="space-y-2 py-3">
        <div className="flex items-center gap-2">
          <button
            className="text-muted-foreground hover:text-foreground cursor-grab"
            onClick={(e) => e.stopPropagation()}
            {...attributes}
            {...listeners}
            aria-label="reorder"
          >
            <GripVertical className="size-4" />
          </button>
          <Badge variant="secondary">{slide.slide_type}</Badge>
          <span className="text-muted-foreground text-xs">#{index + 1}</span>
          <button
            className="text-muted-foreground hover:text-destructive ml-auto"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            aria-label="delete"
          >
            <Trash2 className="size-4" />
          </button>
        </div>

        {/* 预览（选中页由右侧表单实时驱动，套用所选品牌色） */}
        <div
          className="deck-fonts overflow-hidden rounded-xl border"
          style={previewStyle}
        >
          {renderSlide(slide.slide_type, content)}
        </div>

        {onInsertBelow && (
          <button
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onInsertBelow();
            }}
          >
            <Plus className="size-3.5" />
            {m['settings.deck_editor.insert_below']()}
          </button>
        )}
      </CardContent>
    </Card>
  );
}

/** 右侧栏：编辑当前选中页（AI 改写 / 表单 / 高级 JSON / 保存）。按 slide.id remount。 */
function InspectPanel({
  deckId,
  slide,
  content,
  onChange,
  onSaved,
}: {
  deckId: string;
  slide: SlideDTO;
  content: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const zh = getLocale() === 'zh';
  const tpl = getSlideTemplate(slide.slide_type);
  const [instruction, setInstruction] = useState('');
  const [showJson, setShowJson] = useState(false);
  const [canvasOpen, setCanvasOpen] = useState(false);
  const isCanvas = slide.slide_type === 'canvas';
  const [jsonDraft, setJsonDraft] = useState(() =>
    JSON.stringify(content, null, 2)
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
      onSaved();
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
      onChange(s.content);
      setJsonDraft(JSON.stringify(s.content, null, 2));
      setInstruction('');
      toast.success(m['settings.deck_editor.ai_iterated']());
      qc.invalidateQueries({ queryKey: ['deck', deckId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{slide.slide_type}</Badge>
          <span className="font-semibold">
            {slideName(slide.slide_type, tpl?.name ?? slide.slide_type, zh)}
          </span>
        </div>
        {tpl?.whenToUse && (
          <p className="text-muted-foreground mt-1 text-xs">
            {slideWhen(slide.slide_type, tpl.whenToUse, zh)}
          </p>
        )}
      </div>

      {isCanvas ? (
        <>
          <Button
            variant="secondary"
            className="w-full gap-1"
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
                  png,
                  svg,
                }: {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  scene: any;
                  png: string;
                  svg: string;
                }) => {
                  const nc = { ...content, scene, png, svg };
                  onChange(nc);
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
              className="h-8"
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
            onChange={onChange}
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
              onClick={() => onChange(JSON.parse(jsonDraft))}
            >
              {m['settings.deck_editor.apply_json']()}
            </Button>
          </div>
        )}
      </div>

      <Button
        className="w-full"
        disabled={save.isPending}
        onClick={() => save.mutate(undefined)}
      >
        {m['settings.deck_editor.save']()}
      </Button>
    </div>
  );
}

type Snap = Record<string, unknown>;

/**
 * 每页（按 slide.id）的草稿撤销/重做历史。会话内有效、纯前端。
 * - record：用户改动经 debounce 合并成一格快照（连续打字停顿后才落一格）
 * - undo/redo：先 flush 待提交项，再移动指针，返回目标快照供上层 setDraft
 * - reset：保存后清空该页历史，以新内容为新基线
 */
function useDraftHistory() {
  const ref = useRef<Record<string, { stack: Snap[]; ptr: number }>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<{ sid: string; val: Snap } | null>(null);
  const [, bump] = useReducer((x: number) => x + 1, 0);

  const flush = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const p = pending.current;
    pending.current = null;
    if (!p) return;
    const h = ref.current[p.sid];
    if (!h) return;
    if (JSON.stringify(h.stack[h.ptr]) === JSON.stringify(p.val)) return;
    h.stack = h.stack.slice(0, h.ptr + 1);
    h.stack.push(p.val);
    h.ptr = h.stack.length - 1;
    bump();
  };

  const record = (sid: string, base: Snap, val: Snap) => {
    if (!ref.current[sid]) ref.current[sid] = { stack: [base], ptr: 0 };
    pending.current = { sid, val };
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 400);
    bump(); // 让"有待提交改动 → 可撤销"即时反映到按钮
  };

  const step = (sid: string, dir: -1 | 1): Snap | null => {
    flush();
    const h = ref.current[sid];
    if (!h) return null;
    const next = h.ptr + dir;
    if (next < 0 || next >= h.stack.length) return null;
    h.ptr = next;
    bump();
    return h.stack[next];
  };

  return {
    record,
    undo: (sid: string) => step(sid, -1),
    redo: (sid: string) => step(sid, 1),
    canUndo: (sid: string) =>
      (ref.current[sid]?.ptr ?? 0) > 0 || pending.current?.sid === sid,
    canRedo: (sid: string) => {
      const h = ref.current[sid];
      return !!h && h.ptr < h.stack.length - 1;
    },
    reset: (sid: string) => {
      delete ref.current[sid];
      if (pending.current?.sid === sid) pending.current = null;
      bump();
    },
  };
}

function DeckEditorPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const sensors = useSensors(useSensor(PointerSensor));
  const [order, setOrder] = useState<string[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [addQ, setAddQ] = useState('');
  const [addAt, setAddAt] = useState<number | undefined>(undefined);
  const [selectedId, setSelectedId] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  // 每页的未保存编辑草稿（键=slide.id）；未选中/未改动的页回退到已保存内容。
  const [drafts, setDrafts] = useState<Record<string, Record<string, unknown>>>(
    {}
  );

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
    if (deckQ.data) {
      const ids = deckQ.data.slides.map((s) => s.id);
      setOrder(ids);
      setSelectedId((cur) => (cur && ids.includes(cur) ? cur : (ids[0] ?? '')));
    }
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
  const delSlide = useMutation({
    mutationFn: (slideId: string) =>
      apiDelete(`/api/decks/${id}/slides/${slideId}`),
    onSuccess: (_d, slideId) => {
      toast.success(m['settings.deck_editor.deleted']());
      if (slideId === selectedId) {
        const i = order.indexOf(slideId);
        setSelectedId(order[i + 1] ?? order[i - 1] ?? '');
      }
      setDrafts((d) => {
        const n = { ...d };
        delete n[slideId];
        return n;
      });
      qc.invalidateQueries({ queryKey: ['deck', id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const draftFor = (s: SlideDTO) => drafts[s.id] ?? s.content;
  const setDraft = (sid: string, c: Record<string, unknown>) =>
    setDrafts((d) => ({ ...d, [sid]: c }));
  const clearDraft = (sid: string) =>
    setDrafts((d) => {
      const n = { ...d };
      delete n[sid];
      return n;
    });

  const hist = useDraftHistory();

  // 有未保存修改：某页存在草稿且与已保存内容不同（改回原样不算脏）。
  const dirty = (deckQ.data?.slides ?? []).some((s) => {
    const d = drafts[s.id];
    return d !== undefined && JSON.stringify(d) !== JSON.stringify(s.content);
  });
  // 一个 blocker 同时兜住站内跳转（shouldBlockFn）与刷新/关标签（enableBeforeUnload）。
  const leaveBlocker = useBlocker({
    shouldBlockFn: () => dirty,
    enableBeforeUnload: () => dirty,
    withResolver: true,
  });

  // 撤销/重做快捷键（Cmd/Ctrl+Z、Cmd/Ctrl+Shift+Z、Ctrl+Y）。
  // 焦点在输入框内时不拦截，交给浏览器对该字段做原生字符级撤销。
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const k = e.key.toLowerCase();
      if (k !== 'z' && k !== 'y') return;
      const el = document.activeElement as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || el?.isContentEditable)
        return;
      if (!selectedId) return;
      e.preventDefault();
      const redo = (k === 'z' && e.shiftKey) || k === 'y';
      const v = redo ? hist.redo(selectedId) : hist.undo(selectedId);
      if (v) setDraft(selectedId, v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

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
  const selected = ordered.find((s) => s.id === selectedId) ?? null;

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
    // 固定为一屏高的 flex 列：顶部工具条 + 下方独立滚动的双栏，
    // 右侧 Inspect 面板始终在视口内（不用 sticky，避免祖先 overflow 导致失效）。
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col gap-4 p-4 md:p-6">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
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

      <div className="flex min-h-0 flex-1 gap-4">
        {/* 中间：独立滚动的幻灯片预览列表 */}
        <div className="min-w-0 flex-1 space-y-3 overflow-y-auto pr-1">
          <p className="text-muted-foreground text-xs">
            {m['settings.deck_editor.reorder_hint']()}
          </p>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext
              items={order}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {ordered.map((s, idx) => (
                  <SlidePreviewCard
                    key={s.id}
                    slide={s}
                    index={idx}
                    content={draftFor(s)}
                    previewStyle={previewStyle}
                    selected={s.id === selectedId}
                    onSelect={() => setSelectedId(s.id)}
                    onDelete={() => delSlide.mutate(s.id)}
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
        </div>

        {/* 右侧：可收起的 Inspect 编辑面板（独立滚动，始终在视口内） */}
        {collapsed ? (
          <div className="shrink-0">
            <Button
              variant="outline"
              size="icon"
              aria-label={m['settings.deck_editor.expand_panel']()}
              onClick={() => setCollapsed(false)}
            >
              <PanelRightOpen className="size-4" />
            </Button>
          </div>
        ) : (
          <div className="w-[360px] shrink-0 overflow-y-auto">
            <Card>
              <CardContent className="space-y-3 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">
                    {m['settings.deck_editor.inspect']()}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                      aria-label={m['settings.deck_editor.undo']()}
                      title={m['settings.deck_editor.undo']()}
                      disabled={!selected || !hist.canUndo(selected.id)}
                      onClick={() => {
                        if (!selected) return;
                        const v = hist.undo(selected.id);
                        if (v) setDraft(selected.id, v);
                      }}
                    >
                      <Undo2 className="size-4" />
                    </button>
                    <button
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                      aria-label={m['settings.deck_editor.redo']()}
                      title={m['settings.deck_editor.redo']()}
                      disabled={!selected || !hist.canRedo(selected.id)}
                      onClick={() => {
                        if (!selected) return;
                        const v = hist.redo(selected.id);
                        if (v) setDraft(selected.id, v);
                      }}
                    >
                      <Redo2 className="size-4" />
                    </button>
                    <button
                      className="text-muted-foreground hover:text-foreground ml-1"
                      aria-label={m['settings.deck_editor.collapse_panel']()}
                      onClick={() => setCollapsed(true)}
                    >
                      <PanelRightClose className="size-4" />
                    </button>
                  </div>
                </div>
                {selected ? (
                  <InspectPanel
                    key={selected.id}
                    deckId={id}
                    slide={selected}
                    content={draftFor(selected)}
                    onChange={(c) => {
                      hist.record(selected.id, selected.content, c);
                      setDraft(selected.id, c);
                    }}
                    onSaved={() => {
                      clearDraft(selected.id);
                      hist.reset(selected.id);
                    }}
                  />
                ) : (
                  <p className="text-muted-foreground text-sm">
                    {m['settings.deck_editor.pick_slide']()}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

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

      <Dialog
        open={leaveBlocker.status === 'blocked'}
        onOpenChange={(o) => {
          if (!o) leaveBlocker.reset?.();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {m['settings.deck_editor.unsaved_title']()}
            </DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            {m['settings.deck_editor.unsaved_desc']()}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => leaveBlocker.reset?.()}>
              {m['settings.deck_editor.unsaved_stay']()}
            </Button>
            <Button
              variant="destructive"
              onClick={() => leaveBlocker.proceed?.()}
            >
              {m['settings.deck_editor.unsaved_leave']()}
            </Button>
          </DialogFooter>
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
