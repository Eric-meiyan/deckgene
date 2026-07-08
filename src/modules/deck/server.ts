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
export interface PublicBrand {
  palette: Record<string, string> | null;
  typography: Record<string, string> | null;
  logo_url: string | null;
}
export interface PublicDeck {
  id: string;
  title: string;
  slug: string;
  locale: string;
  brand: PublicBrand | null;
  slides: PublicSlide[];
}

export interface LockedDeck {
  locked: true;
  id: string;
  title: string;
}

export const getPublicDeckFn = createServerFn()
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }): Promise<PublicDeck | LockedDeck | null> => {
    const { getPublishedDeckBySlug, shapePublicDeck } =
      await import('./deck.service');
    const deck = await getPublishedDeckBySlug(data.slug);
    if (!deck) return null;

    // 过期的 expiring 仍视为不可见（保留原逻辑）
    if (
      deck.visibility === 'expiring' &&
      deck.expiresAt &&
      new Date(deck.expiresAt).getTime() < Date.now()
    ) {
      return null;
    }

    // 密码保护：loader 不下发内容，只回 locked 元信息；内容走 /api/d/:slug/content
    if (deck.visibility === 'password') {
      return { locked: true, id: deck.id, title: deck.title };
    }

    const shaped = await shapePublicDeck(deck);
    return {
      id: deck.id,
      title: shaped.title,
      slug: deck.slug,
      locale: deck.locale,
      brand: shaped.brand,
      slides: shaped.slides,
    };
  });
