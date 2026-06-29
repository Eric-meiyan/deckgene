import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { toast } from 'sonner';

import { useRouter } from '@/core/i18n/navigation';
import { apiGet, apiPost } from '@/lib/api-client';
import { m } from '@/paraglide/messages.js';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface DeckTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  slide_count: number;
  slide_types: string[];
}

function TemplatesPage() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ['deck-templates'],
    queryFn: () => apiGet<DeckTemplate[]>('/api/deck-templates'),
  });

  const use = useMutation({
    mutationFn: (id: string) =>
      apiPost<{ deck_id: string }>('/api/decks/from-template', {
        template_id: id,
      }),
    onMutate: (id) => setBusy(id),
    onSuccess: (d) => router.push(`/settings/decks/${d.deck_id}`),
    onError: (e: Error) => {
      setBusy(null);
      toast.error(e.message);
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {m['settings.templates.title']()}
        </h1>
        <p className="text-muted-foreground text-sm">
          {m['settings.templates.subtitle']()}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.data?.map((t) => (
          <Card key={t.id} className="flex flex-col">
            <CardContent className="flex flex-1 flex-col gap-3 py-4">
              <div className="flex items-center justify-between">
                <Badge variant="secondary">{t.category}</Badge>
                <span className="text-muted-foreground text-xs">
                  {t.slide_count} {m['settings.templates.slides']()}
                </span>
              </div>
              <div>
                <div className="font-medium">{t.name}</div>
                <p className="text-muted-foreground mt-1 text-sm">
                  {t.description}
                </p>
              </div>
              {/* 页型缩略 */}
              <div className="flex flex-wrap gap-1">
                {t.slide_types.slice(0, 8).map((st, i) => (
                  <span
                    key={i}
                    className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10px]"
                  >
                    {st}
                  </span>
                ))}
              </div>
              <Button
                className="mt-auto"
                disabled={busy === t.id}
                onClick={() => use.mutate(t.id)}
              >
                {busy === t.id
                  ? m['settings.templates.creating']()
                  : m['settings.templates.use']()}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export const Route = createFileRoute('/settings/templates')({
  component: TemplatesPage,
});
