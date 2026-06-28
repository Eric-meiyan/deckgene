import { createServerFn } from '@tanstack/react-start';

/**
 * 公开 deck 渲染的 server function。
 * 动态 import 让 drizzle 不进客户端 bundle（对齐 content/posts/server 模式）。
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonObject = Record<string, any>;

export interface PublicSlide {
  id: string;
  slide_type: string;
  order: number;
  content: JsonObject;
  notes: string | null;
}
export interface PublicDeck {
  id: string;
  title: string;
  slug: string;
  locale: string;
  slides: PublicSlide[];
}

export const getPublicDeckFn = createServerFn()
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }): Promise<PublicDeck | null> => {
    const { getPublishedDeckBySlug } = await import('./deck.service');
    const deck = await getPublishedDeckBySlug(data.slug);
    if (!deck) return null;

    // visibility 处理：password 暂不开放渲染；expiring 过期视为不可见。
    if (deck.visibility === 'password') return null;
    if (
      deck.visibility === 'expiring' &&
      deck.expiresAt &&
      new Date(deck.expiresAt).getTime() < Date.now()
    ) {
      return null;
    }

    return {
      id: deck.id,
      title: deck.title,
      slug: deck.slug,
      locale: deck.locale,
      slides: deck.slides.map((s) => ({
        id: s.id,
        slide_type: s.slideType,
        order: s.order,
        content: (s.content ?? {}) as JsonObject,
        notes: s.notes ?? null,
      })),
    };
  });
