import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Minus, Plus, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { useRouter } from '@/core/i18n/navigation';
import { apiPost } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

const TONES = [
  ['', 'settings.draft.auto'],
  ['professional', 'settings.draft.tone_professional'],
  ['casual', 'settings.draft.tone_casual'],
  ['confident', 'settings.draft.tone_confident'],
  ['friendly', 'settings.draft.tone_friendly'],
  ['academic', 'settings.draft.tone_academic'],
] as const;
const AUDIENCES = [
  ['', 'settings.draft.auto'],
  ['general', 'settings.draft.aud_general'],
  ['investors', 'settings.draft.aud_investors'],
  ['customers', 'settings.draft.aud_customers'],
  ['team', 'settings.draft.aud_team'],
  ['students', 'settings.draft.aud_students'],
  ['executives', 'settings.draft.aud_exec'],
] as const;

function DraftPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const [input, setInput] = useState('');
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [reading, setReading] = useState(false);

  const [slides, setSlides] = useState(0); // 0 = auto
  const [tone, setTone] = useState('');
  const [audience, setAudience] = useState('');
  const [depth, setDepth] = useState<'concise' | 'balanced' | 'detailed'>(
    'balanced'
  );
  const [language, setLanguage] = useState<'auto' | 'zh' | 'en'>('auto');

  const gen = useMutation({
    mutationFn: () =>
      apiPost<{ deck_id: string }>('/api/decks/generate', {
        input: input || undefined,
        url: url || undefined,
        title,
        slide_count: slides > 0 ? slides : undefined,
        tone: tone || undefined,
        audience: audience || undefined,
        depth,
        language: language !== 'auto' ? language : undefined,
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

  const seg = (active: boolean) =>
    cn(
      'flex-1 rounded-md px-3 py-1.5 text-sm transition-colors',
      active
        ? 'bg-primary text-primary-foreground'
        : 'text-muted-foreground hover:text-foreground'
    );

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{m['settings.draft.title']()}</h1>
        <p className="text-muted-foreground text-sm">
          {m['settings.draft.subtitle']()}
        </p>
      </div>

      {/* 输入 */}
      <Card>
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
                rows={7}
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
        </CardContent>
      </Card>

      {/* 选项 */}
      <Card>
        <CardContent className="space-y-4 py-6">
          <div className="text-sm font-semibold">
            {m['settings.draft.options']()}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {/* 页数 */}
            <div>
              <div className="text-muted-foreground mb-1.5 text-xs">
                {m['settings.draft.slides']()}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSlides(0)}
                  className={seg(slides === 0)}
                >
                  {m['settings.draft.auto']()}
                </button>
                <div className="flex items-center rounded-md border">
                  <button
                    className="px-2 py-1.5"
                    onClick={() => setSlides((s) => Math.max(3, (s || 8) - 1))}
                  >
                    <Minus className="size-3" />
                  </button>
                  <span className="w-8 text-center text-sm">
                    {slides || '–'}
                  </span>
                  <button
                    className="px-2 py-1.5"
                    onClick={() => setSlides((s) => Math.min(20, (s || 7) + 1))}
                  >
                    <Plus className="size-3" />
                  </button>
                </div>
              </div>
            </div>
            {/* 语气 */}
            <div>
              <div className="text-muted-foreground mb-1.5 text-xs">
                {m['settings.draft.tone']()}
              </div>
              <Select value={tone} onValueChange={(v) => setTone(v ?? '')}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONES.map(([v, k]) => (
                    <SelectItem key={v || 'auto'} value={v}>
                      {m[k]()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* 受众 */}
            <div>
              <div className="text-muted-foreground mb-1.5 text-xs">
                {m['settings.draft.audience']()}
              </div>
              <Select
                value={audience}
                onValueChange={(v) => setAudience(v ?? '')}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AUDIENCES.map(([v, k]) => (
                    <SelectItem key={v || 'auto'} value={v}>
                      {m[k]()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* 详略 */}
            <div>
              <div className="text-muted-foreground mb-1.5 text-xs">
                {m['settings.draft.depth']()}
              </div>
              <div className="flex items-center gap-1 rounded-md border p-1">
                {(['concise', 'balanced', 'detailed'] as const).map((d) => (
                  <button
                    key={d}
                    className={seg(depth === d)}
                    onClick={() => setDepth(d)}
                  >
                    {m[`settings.draft.${d}`]()}
                  </button>
                ))}
              </div>
            </div>
            {/* 语言 */}
            <div>
              <div className="text-muted-foreground mb-1.5 text-xs">
                {m['settings.draft.language']()}
              </div>
              <div className="flex items-center gap-1 rounded-md border p-1">
                {(['auto', 'zh', 'en'] as const).map((l) => (
                  <button
                    key={l}
                    className={seg(language === l)}
                    onClick={() => setLanguage(l)}
                  >
                    {l === 'auto'
                      ? m['settings.draft.auto']()
                      : l === 'zh'
                        ? '中文'
                        : 'English'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button
        size="lg"
        className="gap-2"
        disabled={(!input.trim() && !url.trim()) || reading || gen.isPending}
        onClick={() => gen.mutate()}
      >
        <Sparkles className="size-4" />
        {gen.isPending
          ? m['settings.decks.generating']()
          : m['settings.decks.generate']()}
      </Button>
    </div>
  );
}

export const Route = createFileRoute('/settings/draft')({
  component: DraftPage,
});
