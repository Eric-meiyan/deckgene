import { useState } from 'react';
import { createFileRoute, notFound } from '@tanstack/react-router';
import { Play } from 'lucide-react';

import { getPublicDeckFn } from '@/modules/deck/server';
import { m } from '@/paraglide/messages.js';
import { DeckPasswordGate } from '@/components/deck/deck-password-gate';
import { DeckPlayer } from '@/components/deck/deck-player';
import { brandStyle, DeckRenderer } from '@/components/deck/deck-renderer';

/**
 * GET /d/{slug} — 公开 live deck 渲染页（见 docs/PRD.md §9.8）。
 * 仅渲染已发布且可见的 deck；否则 404。默认 noindex（白标/隐私）。
 * 滚动查看 + 「演示」全屏播放（数据已在页内，无需登录）。
 * 密码保护的 deck 走 <DeckPasswordGate />（见 docs/PRD.md §9.9）。
 */
function DeckPage() {
  const { deck } = Route.useLoaderData();
  const { slug } = Route.useParams();
  const [presenting, setPresenting] = useState(false);

  if ('locked' in deck) {
    return <DeckPasswordGate slug={slug} title={deck.title} />;
  }

  return (
    <>
      <DeckRenderer slides={deck.slides} brand={deck.brand} />
      <button
        onClick={() => setPresenting(true)}
        className="bg-primary text-primary-foreground fixed right-5 bottom-5 z-40 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold shadow-lg"
      >
        <Play className="size-4" />
        {m['settings.deck_editor.present']()}
      </button>
      {presenting && (
        <DeckPlayer
          title={deck.title}
          slides={deck.slides}
          style={brandStyle(deck.brand)}
          onExit={() => setPresenting(false)}
        />
      )}
    </>
  );
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
