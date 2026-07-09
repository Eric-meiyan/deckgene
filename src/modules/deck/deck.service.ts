import { and, asc, desc, eq, gte, inArray, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import { db } from '@/core/db';
import {
  deck,
  deckView,
  slide,
  type Deck,
  type Slide,
} from '@/config/db/schema';

import { makeSlug } from './job.service';
// ─── Slide 编辑（控制台编辑器 / §9.5）───────────────────────────────────────

import { getSlideTemplate, validateSlideContent } from './templates/registry';

/**
 * Deck / Slide 数据服务（见 docs/PRD.md §5 / §9.4）。
 * deck = 有序 typed slides；所有查询强制 userId 隔离。
 */

export interface NewSlideInput {
  slideType: string;
  content: Record<string, unknown>;
  notes?: string;
}

export interface DeckWithSlides extends Deck {
  slides: Slide[];
}

/** 事务创建一个 deck 及其有序 slides。 */
export async function createDeckWithSlides(params: {
  userId: string;
  title: string;
  brandId?: string | null;
  locale?: string;
  sourceInput?: string;
  slides: NewSlideInput[];
}): Promise<DeckWithSlides> {
  const deckId = `deck_${nanoid(12)}`;
  const slug = makeSlug(params.title);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return db().transaction(async (tx: any) => {
    const [deckRow] = await tx
      .insert(deck)
      .values({
        id: deckId,
        userId: params.userId,
        brandId: params.brandId ?? null,
        title: params.title,
        slug,
        status: 'draft',
        visibility: 'unlisted',
        noIndex: true,
        locale: params.locale ?? 'en',
        sourceInput: params.sourceInput,
      })
      .returning();

    const slideRows: Slide[] = [];
    if (params.slides.length > 0) {
      const inserted = await tx
        .insert(slide)
        .values(
          params.slides.map((s, i) => ({
            id: `sec_${nanoid(10)}`,
            deckId,
            slideType: s.slideType,
            order: i,
            content: s.content,
            notes: s.notes,
          }))
        )
        .returning();
      slideRows.push(...inserted);
    }

    return { ...deckRow, slides: slideRows };
  });
}

/** 取单个 deck（含有序 slides），userId 隔离。 */
export async function getDeckWithSlides(
  id: string,
  userId: string
): Promise<DeckWithSlides | null> {
  const [deckRow] = await db()
    .select()
    .from(deck)
    .where(and(eq(deck.id, id), eq(deck.userId, userId)))
    .limit(1);
  if (!deckRow) return null;

  const slides = await db()
    .select()
    .from(slide)
    .where(eq(slide.deckId, id))
    .orderBy(asc(slide.order));

  return { ...deckRow, slides };
}

/**
 * 公开渲染用：按 slug 取**已发布**的 deck（含有序 slides），无 userId 限制。
 * 仅返回 status=published；visibility/过期 由调用方处理。
 */
export async function getPublishedDeckBySlug(
  slug: string
): Promise<DeckWithSlides | null> {
  const [deckRow] = await db()
    .select()
    .from(deck)
    .where(and(eq(deck.slug, slug), eq(deck.status, 'published')))
    .limit(1);
  if (!deckRow) return null;

  const slides = await db()
    .select()
    .from(slide)
    .where(eq(slide.deckId, deckRow.id))
    .orderBy(asc(slide.order));

  return { ...deckRow, slides };
}

/** 只取已发布 deck 的 id(浏览统计信标用,避免拉全部 slides)。 */
export async function getPublishedDeckIdBySlug(
  slug: string
): Promise<{ id: string } | null> {
  const [row] = await db()
    .select({ id: deck.id })
    .from(deck)
    .where(and(eq(deck.slug, slug), eq(deck.status, 'published')))
    .limit(1);
  return row ?? null;
}

/** 从 deck 级模板创建一个 deck（套用激活品牌；不扣积分）。 */
export async function createDeckFromTemplate(
  userId: string,
  templateId: string
): Promise<DeckWithSlides | null> {
  const { getDeckTemplate } = await import('./templates/deck-templates');
  const tpl = getDeckTemplate(templateId);
  if (!tpl) return null;
  const { getActiveBrand } = await import('./brand.service');
  const active = await getActiveBrand(userId);
  return createDeckWithSlides({
    userId,
    title: tpl.name,
    brandId: active?.id ?? null,
    slides: tpl.slides.map((s) => ({
      slideType: s.slideType,
      content: s.content,
    })),
  });
}

/** 列出用户的 decks（不含 slides）。 */
export async function listDecks(userId: string): Promise<Deck[]> {
  return db()
    .select()
    .from(deck)
    .where(eq(deck.userId, userId))
    .orderBy(desc(deck.updatedAt));
}

export type DeckCover = { slideType: string; content: unknown };

/** 列表 + 每个 deck 的首页（min order）用于渲染缩略图。 */
export async function listDecksWithCover(
  userId: string
): Promise<Array<Deck & { cover: DeckCover | null }>> {
  const decks = await listDecks(userId);
  if (!decks.length) return decks.map((d) => ({ ...d, cover: null }));
  const ids = decks.map((d) => d.id);
  // 精简列，按 (deckId, order) 升序；JS 里取每个 deck 的首个即首页（兼容删除后 order 有空档）。
  const rows = await db()
    .select({
      deckId: slide.deckId,
      slideType: slide.slideType,
      content: slide.content,
    })
    .from(slide)
    .where(inArray(slide.deckId, ids))
    .orderBy(asc(slide.deckId), asc(slide.order));
  const firstByDeck = new Map<string, DeckCover>();
  for (const r of rows) {
    if (!firstByDeck.has(r.deckId))
      firstByDeck.set(r.deckId, { slideType: r.slideType, content: r.content });
  }
  return decks.map((d) => ({ ...d, cover: firstByDeck.get(d.id) ?? null }));
}

/** 发布：status=published + 记录 publishedAt，live URL 生效。 */
export async function publishDeck(
  id: string,
  userId: string
): Promise<Deck | null> {
  const [row] = await db()
    .update(deck)
    .set({ status: 'published', publishedAt: new Date() })
    .where(and(eq(deck.id, id), eq(deck.userId, userId)))
    .returning();
  return row ?? null;
}

/** 取消发布：回 draft，live URL 立即停止解析。 */
export async function unpublishDeck(
  id: string,
  userId: string
): Promise<Deck | null> {
  const [row] = await db()
    .update(deck)
    .set({ status: 'draft', publishedAt: null })
    .where(and(eq(deck.id, id), eq(deck.userId, userId)))
    .returning();
  return row ?? null;
}

/** 删除 deck（slides 级联删除）。返回是否删除成功。 */
export async function deleteDeck(id: string, userId: string): Promise<boolean> {
  const rows = await db()
    .delete(deck)
    .where(and(eq(deck.id, id), eq(deck.userId, userId)))
    .returning({ id: deck.id });
  return rows.length > 0;
}

/** 校验 deck 归属，返回 deck 行或 null。 */
async function ownDeck(deckId: string, userId: string): Promise<Deck | null> {
  const [row] = await db()
    .select()
    .from(deck)
    .where(and(eq(deck.id, deckId), eq(deck.userId, userId)))
    .limit(1);
  return row ?? null;
}

/** 更新一页的 content（按 slide_type schema 校验）/ notes。 */
/** 切换 deck 关联的品牌（编辑器内换肤）。brandId=null 清除。 */
export async function setDeckBrand(
  deckId: string,
  userId: string,
  brandId: string | null
): Promise<Deck | null> {
  const d = await ownDeck(deckId, userId);
  if (!d) return null;
  const [row] = await db()
    .update(deck)
    .set({ brandId })
    .where(eq(deck.id, deckId))
    .returning();
  return row ?? null;
}

export async function updateSlide(
  deckId: string,
  slideId: string,
  userId: string,
  patch: { content?: Record<string, unknown>; notes?: string }
): Promise<Slide | null> {
  const d = await ownDeck(deckId, userId);
  if (!d) return null;
  const [existing] = await db()
    .select()
    .from(slide)
    .where(and(eq(slide.id, slideId), eq(slide.deckId, deckId)))
    .limit(1);
  if (!existing) return null;

  const set: Partial<typeof slide.$inferInsert> = {};
  if (patch.content !== undefined) {
    const v = validateSlideContent(existing.slideType, patch.content);
    if (!v.ok) throw new Error(`invalid content: ${v.error}`);
    set.content = patch.content;
  }
  if (patch.notes !== undefined) set.notes = patch.notes;

  const [row] = await db()
    .update(slide)
    .set(set)
    .where(eq(slide.id, slideId))
    .returning();
  return row ?? null;
}

/** 新增一页（默认追加到末尾；可指定 index 插入）。 */
export async function addSlide(
  deckId: string,
  userId: string,
  input: { slideType: string; content: Record<string, unknown>; index?: number }
): Promise<Slide | null> {
  const d = await ownDeck(deckId, userId);
  if (!d) return null;
  // 加页不强校验（编辑器「先加空页再填」流程）；保存(updateSlide)时才按 schema 校验。
  if (!getSlideTemplate(input.slideType)) {
    throw new Error(`unknown slide_type: ${input.slideType}`);
  }

  const rows = await db()
    .select()
    .from(slide)
    .where(eq(slide.deckId, deckId))
    .orderBy(asc(slide.order));
  const at = input.index ?? rows.length;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return db().transaction(async (tx: any) => {
    // 给插入点之后的页 order +1
    for (let i = rows.length - 1; i >= at; i--) {
      await tx
        .update(slide)
        .set({ order: i + 1 })
        .where(eq(slide.id, rows[i].id));
    }
    const [row] = await tx
      .insert(slide)
      .values({
        id: `sec_${nanoid(10)}`,
        deckId,
        slideType: input.slideType,
        order: at,
        content: input.content,
      })
      .returning();
    return row ?? null;
  });
}

/** 删除一页。 */
export async function deleteSlide(
  deckId: string,
  slideId: string,
  userId: string
): Promise<boolean> {
  const d = await ownDeck(deckId, userId);
  if (!d) return false;
  const rows = await db()
    .delete(slide)
    .where(and(eq(slide.id, slideId), eq(slide.deckId, deckId)))
    .returning({ id: slide.id });
  return rows.length > 0;
}

/** 按给定 id 顺序重排（仅接受该 deck 的 slide id）。 */
export async function reorderSlides(
  deckId: string,
  userId: string,
  orderedIds: string[]
): Promise<boolean> {
  const d = await ownDeck(deckId, userId);
  if (!d) return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await db().transaction(async (tx: any) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx
        .update(slide)
        .set({ order: i })
        .where(and(eq(slide.id, orderedIds[i]), eq(slide.deckId, deckId)));
    }
  });
  return true;
}

/** 序列化为对外 API 形状（见 docs/PRD.md §5.2）。 */
export function toApiDeck(
  d: Deck,
  appUrl: string,
  slides?: Slide[]
): Record<string, unknown> {
  return {
    id: d.id,
    title: d.title,
    slug: d.slug,
    status: d.status,
    visibility: d.visibility,
    brand_id: d.brandId,
    locale: d.locale,
    url: d.status === 'published' ? `${appUrl}/d/${d.slug}` : null,
    created_at: d.createdAt,
    updated_at: d.updatedAt,
    published_at: d.publishedAt,
    ...(slides
      ? {
          slides: slides.map((s) => ({
            id: s.id,
            slide_type: s.slideType,
            order: s.order,
            content: s.content,
            notes: s.notes,
          })),
        }
      : {}),
  };
}

/** 设置/移除 deck 分享密码。password 非空→password 模式；null→回 unlisted。 */
export async function setDeckShare(
  id: string,
  userId: string,
  opts: { password: string | null }
): Promise<Deck | null> {
  const { hashDeckPassword } = await import('@/lib/deck-password');
  const hasPw = typeof opts.password === 'string' && opts.password.length > 0;
  const [row] = await db()
    .update(deck)
    .set(
      hasPw
        ? {
            visibility: 'password',
            passwordHash: await hashDeckPassword(opts.password as string),
          }
        : { visibility: 'unlisted', passwordHash: null }
    )
    .where(and(eq(deck.id, id), eq(deck.userId, userId)))
    .returning();
  return row ?? null;
}

/** 把 DeckWithSlides 塑成公开渲染负载（title + slides + brand）。 */
export async function shapePublicDeck(d: DeckWithSlides): Promise<{
  title: string;
  slides: {
    id: string;
    slide_type: string;
    order: number;
    content: Record<string, unknown>;
    notes: string | null;
  }[];
  brand: {
    palette: Record<string, string> | null;
    typography: Record<string, string> | null;
    logo_url: string | null;
  } | null;
}> {
  let brand = null as null | {
    palette: Record<string, string> | null;
    typography: Record<string, string> | null;
    logo_url: string | null;
  };
  if (d.brandId) {
    const { brand: brandTable } = await import('@/config/db/schema');
    const [b] = await db()
      .select()
      .from(brandTable)
      .where(eq(brandTable.id, d.brandId))
      .limit(1);
    if (b) {
      brand = {
        palette: b.palette as Record<string, string> | null,
        typography: b.typography as Record<string, string> | null,
        logo_url: b.logoUrl,
      };
    }
  }
  return {
    title: d.title,
    slides: d.slides.map((s) => ({
      id: s.id,
      slide_type: s.slideType,
      order: s.order,
      content: (s.content ?? {}) as Record<string, unknown>,
      notes: s.notes,
    })),
    brand,
  };
}

// ─── 浏览统计（deck analytics）──────────────────────────────────────────────

const VIEW_THROTTLE_MS = 30 * 60 * 1000; // 30 分钟

/** 记录一次浏览：同一访客对同一 deck 30 分钟内只记 1 次。 */
export async function recordDeckView(
  deckId: string,
  visitorId: string
): Promise<void> {
  const cutoff = new Date(Date.now() - VIEW_THROTTLE_MS);
  const [recent] = await db()
    .select({ id: deckView.id })
    .from(deckView)
    .where(
      and(
        eq(deckView.deckId, deckId),
        eq(deckView.visitorId, visitorId),
        gte(deckView.createdAt, cutoff)
      )
    )
    .limit(1);
  if (recent) return; // 命中节流，不重复记录
  const { getUuid } = await import('@/lib/hash');
  await db()
    .insert(deckView)
    .values({ id: getUuid(), deckId, visitorId, createdAt: new Date() });
}

/** 所有者读某 deck 的统计：总浏览 + 独立访客。非本人/不存在返回 null。 */
export async function getDeckStats(
  deckId: string,
  userId: string
): Promise<{ views: number; uniques: number } | null> {
  const [owned] = await db()
    .select({ id: deck.id })
    .from(deck)
    .where(and(eq(deck.id, deckId), eq(deck.userId, userId)))
    .limit(1);
  if (!owned) return null;

  const [row] = await db()
    .select({
      views: sql<number>`count(*)`,
      uniques: sql<number>`count(distinct ${deckView.visitorId})`,
    })
    .from(deckView)
    .where(eq(deckView.deckId, deckId));
  return {
    views: Number(row?.views ?? 0),
    uniques: Number(row?.uniques ?? 0),
  };
}
