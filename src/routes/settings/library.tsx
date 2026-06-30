import { useMemo, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';

import { listSlideTemplates } from '@/modules/deck/templates/registry';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { sampleSlideContent } from '@/components/deck/slide-form';
import { renderSlide } from '@/components/deck/slides';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

const CATEGORIES = ['Open', 'Argue', 'Show', 'Close'] as const;
const CAT_LABEL: Record<string, [string, string]> = {
  Open: ['开场', 'Open'],
  Argue: ['论证', 'Argue'],
  Show: ['展示', 'Show'],
  Close: ['收尾', 'Close'],
};

function LibraryPage() {
  const [q, setQ] = useState('');
  const zh = getLocale() === 'zh';
  const all = listSlideTemplates();

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return all;
    return all.filter(
      (t) =>
        t.key.toLowerCase().includes(s) ||
        t.name.toLowerCase().includes(s) ||
        t.whenToUse.toLowerCase().includes(s)
    );
  }, [q, all]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">{m['settings.library.title']()}</h1>
        <p className="text-muted-foreground text-sm">
          {m['settings.library.subtitle']()} · {all.length}
        </p>
      </div>

      <Input
        className="max-w-md"
        placeholder={m['settings.library.search']()}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {CATEGORIES.map((cat) => {
        const items = filtered.filter((t) => t.category === cat);
        if (!items.length) return null;
        return (
          <section key={cat} className="space-y-3">
            <h2 className="text-lg font-semibold">
              {zh ? CAT_LABEL[cat][0] : CAT_LABEL[cat][1]}
              <span className="text-muted-foreground ml-2 text-sm font-normal">
                {items.length}
              </span>
            </h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((t) => (
                <div key={t.key} className="space-y-2">
                  <div className="pointer-events-none overflow-hidden rounded-xl border">
                    {renderSlide(t.key, sampleSlideContent(t.key))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{t.name}</span>
                    <Badge
                      variant="secondary"
                      className="font-mono text-[10px]"
                    >
                      {t.key}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-xs">{t.whenToUse}</p>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export const Route = createFileRoute('/settings/library')({
  component: LibraryPage,
});
