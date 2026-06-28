import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

import { Link, useRouter } from '@/core/i18n/navigation';
import { apiGet, apiPost } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface DeckRow {
  id: string;
  title: string;
  slug: string;
  status: string;
  url: string | null;
  updated_at: string;
}

function DecksPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [title, setTitle] = useState('');

  const list = useQuery({
    queryKey: ['decks'],
    queryFn: () => apiGet<DeckRow[]>('/api/decks'),
  });

  const gen = useMutation({
    mutationFn: () =>
      apiPost<{ deck_id: string }>('/api/decks/generate', { input, title }),
    onSuccess: (d) => {
      setOpen(false);
      setInput('');
      setTitle('');
      qc.invalidateQueries({ queryKey: ['decks'] });
      router.push(`/settings/decks/${d.deck_id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{m['settings.decks.title']()}</h1>
          <p className="text-muted-foreground text-sm">
            {m['settings.decks.subtitle']()}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger className={cn(buttonVariants(), 'gap-2')}>
            <Plus className="size-4" />
            {m['settings.decks.generate']()}
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{m['settings.decks.gen_title']()}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                placeholder={m['settings.decks.title_ph']()}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <Textarea
                rows={6}
                placeholder={m['settings.decks.input_ph']()}
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                disabled={!input.trim() || gen.isPending}
                onClick={() => gen.mutate()}
              >
                {gen.isPending
                  ? m['settings.decks.generating']()
                  : m['settings.decks.generate']()}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {list.data && list.data.length === 0 && (
        <Card>
          <CardContent className="text-muted-foreground py-12 text-center">
            {m['settings.decks.empty']()}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {list.data?.map((d) => (
          <Card key={d.id}>
            <CardContent className="flex items-center justify-between gap-4 py-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{d.title}</span>
                  <Badge
                    variant={d.status === 'published' ? 'default' : 'secondary'}
                  >
                    {d.status === 'published'
                      ? m['settings.decks.published']()
                      : m['settings.decks.draft']()}
                  </Badge>
                </div>
                <div className="text-muted-foreground truncate text-xs">
                  {d.slug}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {d.url && (
                  <a
                    href={d.url}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(
                      buttonVariants({ variant: 'outline', size: 'sm' })
                    )}
                  >
                    {m['settings.decks.view']()}
                  </a>
                )}
                <Link
                  href={`/settings/decks/${d.id}`}
                  className={cn(buttonVariants({ size: 'sm' }))}
                >
                  {m['settings.decks.edit']()}
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export const Route = createFileRoute('/settings/decks')({
  component: DecksPage,
});
