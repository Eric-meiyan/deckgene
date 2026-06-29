import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { useRouter } from '@/core/i18n/navigation';
import { apiPost } from '@/lib/api-client';
import { m } from '@/paraglide/messages.js';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

function DraftPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const [input, setInput] = useState('');
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [reading, setReading] = useState(false);

  const gen = useMutation({
    mutationFn: () =>
      apiPost<{ deck_id: string }>('/api/decks/generate', {
        input: input || undefined,
        url: url || undefined,
        title,
      }),
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['decks'] });
      router.push(`/settings/decks/${d.deck_id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setReading(true);
    try {
      setInput((await f.text()).slice(0, 8000));
    } catch {
      toast.error('read file failed');
    } finally {
      setReading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{m['settings.draft.title']()}</h1>
        <p className="text-muted-foreground text-sm">
          {m['settings.draft.subtitle']()}
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardContent className="space-y-4 py-6">
          <Input
            placeholder={m['settings.decks.title_ph']()}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Tabs defaultValue="text">
            <TabsList className="w-full">
              <TabsTrigger value="text" className="flex-1">
                {m['settings.decks.tab_text']()}
              </TabsTrigger>
              <TabsTrigger value="url" className="flex-1">
                {m['settings.decks.tab_url']()}
              </TabsTrigger>
              <TabsTrigger value="file" className="flex-1">
                {m['settings.decks.tab_file']()}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="text" className="pt-3">
              <Textarea
                rows={8}
                placeholder={m['settings.decks.input_ph']()}
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
            </TabsContent>
            <TabsContent value="url" className="pt-3">
              <Input
                placeholder={m['settings.decks.url_ph']()}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </TabsContent>
            <TabsContent value="file" className="space-y-2 pt-3">
              <input
                type="file"
                accept=".txt,.md,text/plain,text/markdown"
                onChange={handleFile}
                className="text-sm"
              />
              <p className="text-muted-foreground text-xs">
                {reading
                  ? m['settings.decks.reading_file']()
                  : input
                    ? `✓ ${input.length} chars`
                    : m['settings.decks.file_hint']()}
              </p>
            </TabsContent>
          </Tabs>
          <Button
            className="gap-2"
            disabled={
              (!input.trim() && !url.trim()) || reading || gen.isPending
            }
            onClick={() => gen.mutate()}
          >
            <Sparkles className="size-4" />
            {gen.isPending
              ? m['settings.decks.generating']()
              : m['settings.decks.generate']()}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export const Route = createFileRoute('/settings/draft')({
  component: DraftPage,
});
