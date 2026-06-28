import { createFileRoute, notFound } from '@tanstack/react-router';

import { getPublicDeckFn } from '@/modules/deck/server';
import { DeckRenderer } from '@/components/deck/deck-renderer';

/**
 * GET /d/{slug} — 公开 live deck 渲染页（见 docs/PRD.md §9.8）。
 * 仅渲染已发布且可见的 deck；否则 404。默认 noindex（白标/隐私）。
 */
function DeckPage() {
  const { deck } = Route.useLoaderData();
  return <DeckRenderer slides={deck.slides} brand={deck.brand} />;
}

export const Route = createFileRoute('/d/$slug')({
  loader: async ({ params }) => {
    const deck = await getPublicDeckFn({ data: { slug: params.slug } });
    if (!deck) throw notFound();
    return { deck };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData?.deck.title ?? 'deck' },
      // 默认 noindex（白标/隐私，PRD §12.4）
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: DeckPage,
});
