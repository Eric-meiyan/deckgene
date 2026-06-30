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

    // 取关联 brand 的 palette/typography（公开渲染，无 userId）
    let brand: PublicBrand | null = null;
    if (deck.brandId) {
      const { db } = await import('@/core/db');
      const { brand: brandTable } = await import('@/config/db/schema');
      const { eq } = await import('drizzle-orm');
      const [b] = await db()
        .select()
        .from(brandTable)
        .where(eq(brandTable.id, deck.brandId))
        .limit(1);
      if (b)
        brand = {
          palette: b.palette,
          typography: b.typography,
          logo_url: b.logoUrl,
        };
    }

    return {
      id: deck.id,
      title: deck.title,
      slug: deck.slug,
      locale: deck.locale,
      brand,
      slides: deck.slides.map((s) => ({
        id: s.id,
        slide_type: s.slideType,
        order: s.order,
        content: (s.content ?? {}) as JsonObject,
        notes: s.notes ?? null,
      })),
    };
  });
