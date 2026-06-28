import { and, asc, desc, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import { db } from '@/core/db';
import { deck, slide, type Deck, type Slide } from '@/config/db/schema';

import { makeSlug } from './job.service';

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

/** 列出用户的 decks（不含 slides）。 */
export async function listDecks(userId: string): Promise<Deck[]> {
  return db()
    .select()
    .from(deck)
    .where(eq(deck.userId, userId))
    .orderBy(desc(deck.updatedAt));
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
