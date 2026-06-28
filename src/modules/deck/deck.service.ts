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

/** 列出用户的 decks（不含 slides）。 */
export async function listDecks(userId: string): Promise<Deck[]> {
  return db()
    .select()
    .from(deck)
    .where(eq(deck.userId, userId))
    .orderBy(desc(deck.updatedAt));
}
