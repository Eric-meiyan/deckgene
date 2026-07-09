import { useEffect, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Play } from 'lucide-react';
import { z } from 'zod';

import { apiGet, apiPost } from '@/lib/api-client';
import { m } from '@/paraglide/messages.js';
import { DeckPlayer } from '@/components/deck/deck-player';
import {
  brandStyle,
  DeckRenderer,
  type RenderBrand,
  type RenderSlide,
} from '@/components/deck/deck-renderer';
import { TextField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface ContentResp {
  locked: boolean;
  title?: string;
  slides?: RenderSlide[];
  brand?: RenderBrand | null;
}

/**
 * 访客密码门禁：GET /api/d/{slug}/content 返回是否锁定；
 * 有效 cookie（或非密码 deck）直接出内容，否则出密码表单，解锁成功后刷新内容查询。
 */
export function DeckPasswordGate({
  slug,
  title,
}: {
  slug: string;
  title: string;
}) {
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [presenting, setPresenting] = useState(false);

  const contentQuery = useQuery({
    queryKey: ['public-deck-content', slug],
    queryFn: () => apiGet<ContentResp>(`/api/d/${slug}/content`),
  });

  const unlock = useMutation({
    mutationFn: (password: string) =>
      apiPost(`/api/d/${slug}/unlock`, { password }),
    onSuccess: () => {
      setError('');
      queryClient.invalidateQueries({
        queryKey: ['public-deck-content', slug],
      });
    },
    onError: (e: Error) => setError(e.message),
  });

  const form = useForm({
    defaultValues: { password: '' },
    validators: { onSubmit: z.object({ password: z.string().min(1) }) },
    onSubmit: async ({ value }) => {
      await unlock.mutateAsync(value.password);
    },
  });

  useEffect(() => {
    if (contentQuery.data && !contentQuery.data.locked) {
      apiPost(`/api/d/${slug}/view`).catch(() => {});
    }
  }, [contentQuery.data, slug]);

  // 有效 cookie → 直接出内容（回访免密）
  if (contentQuery.data && !contentQuery.data.locked) {
    const d = contentQuery.data;
    return (
      <>
        <DeckRenderer slides={d.slides ?? []} brand={d.brand} />
        <button
          onClick={() => setPresenting(true)}
          className="bg-primary text-primary-foreground fixed right-5 bottom-5 z-40 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold shadow-lg"
        >
          <Play className="size-4" />
          {m['settings.deck_editor.present']()}
        </button>
        {presenting && (
          <DeckPlayer
            title={d.title ?? title}
            slides={d.slides ?? []}
            style={brandStyle(d.brand)}
            onExit={() => setPresenting(false)}
          />
        )}
      </>
    );
  }

  // 未解锁 → 密码框
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">{title}</CardTitle>
            <CardDescription>{m['deck_gate.description']()}</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                form.handleSubmit();
              }}
              className="space-y-4"
            >
              {error && (
                <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
                  {m['deck_gate.wrong_password']()}
                </div>
              )}
              <form.Field name="password">
                {(field) => (
                  <TextField
                    field={field}
                    label={m['deck_gate.password_label']()}
                    type="password"
                    required
                  />
                )}
              </form.Field>
              <form.Subscribe selector={(s) => s.isSubmitting}>
                {(isSubmitting) => (
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? '...' : m['deck_gate.submit']()}
                  </Button>
                )}
              </form.Subscribe>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
