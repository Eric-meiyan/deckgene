import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import {
  Activity,
  ArrowRight,
  CreditCard,
  Key,
  Palette,
  Plug,
  Presentation,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

import { useSession } from '@/core/auth/client';
import { Link } from '@/core/i18n/navigation';
import { apiGet } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

type Subscription = {
  status: string;
  planName?: string | null;
  productName?: string | null;
};

function DashboardPage() {
  const { data: session } = useSession();

  const { data: creditsData } = useQuery({
    queryKey: ['user-credits'],
    queryFn: () => apiGet<{ balance: number }>('/api/credits'),
  });
  const { data: apiKeysData } = useQuery({
    queryKey: ['user-apikeys'],
    queryFn: () => apiGet<unknown[]>('/api/apikeys'),
  });
  const { data: subscriptionData } = useQuery({
    queryKey: ['user-subscription-current'],
    queryFn: () =>
      apiGet<Subscription | null>('/api/user/subscriptions/current'),
  });
  const { data: decksData } = useQuery({
    queryKey: ['decks'],
    queryFn: () =>
      apiGet<{ id: string; title: string; slug: string; status: string }[]>(
        '/api/decks'
      ),
  });

  const credits = creditsData?.balance ?? null;
  const apiKeys = apiKeysData?.length ?? null;
  const subscription = subscriptionData ?? null;

  const planLabel =
    subscription?.planName ||
    subscription?.productName ||
    m['settings.overview.plan_free']();

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {m['settings.title']()}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {m['settings.welcome']({
            name: session?.user?.name || session?.user?.email || '',
          })}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {m['settings.overview.plan']()}
            </CardTitle>
            <TrendingUp className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{planLabel}</div>
            <p className="text-muted-foreground mt-1 text-xs">
              {m['settings.overview.plan_description']()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {m['settings.credits.title']()}
            </CardTitle>
            <CreditCard className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{credits ?? '—'}</div>
            <p className="text-muted-foreground mt-1 text-xs">
              {m['settings.credits.description']()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {m['settings.apikeys.title']()}
            </CardTitle>
            <Key className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{apiKeys ?? '—'}</div>
            <p className="text-muted-foreground mt-1 text-xs">
              {m['settings.overview.apikeys_description']()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {m['settings.overview.usage']()}
            </CardTitle>
            <Activity className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-muted-foreground mt-1 text-xs">
              {m['settings.overview.usage_description']()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 生成 banner */}
      <Card className="brand-gradient text-white">
        <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold">
              {m['settings.home.banner_title']()}
            </h2>
            <p className="mt-1 max-w-xl text-sm text-white/80">
              {m['settings.home.banner_desc']()}
            </p>
          </div>
          <Link
            href="/settings/decks"
            className={cn(
              buttonVariants({ size: 'lg' }),
              'gap-2 rounded-full bg-white text-neutral-900 hover:bg-white/90'
            )}
          >
            <Sparkles className="size-4" />
            {m['settings.home.generate']()}
          </Link>
        </CardContent>
      </Card>

      {/* 产品卡 */}
      <div>
        <h2 className="mb-3 text-sm font-semibold">
          {m['settings.home.products']()}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              href: '/settings/decks',
              icon: Presentation,
              label: m['settings.nav.decks'](),
              desc: m['settings.home.p_decks_desc'](),
            },
            {
              href: '/settings/brands',
              icon: Palette,
              label: m['settings.nav.brands'](),
              desc: m['settings.home.p_brands_desc'](),
            },
            {
              href: '/settings/mcp',
              icon: Plug,
              label: m['settings.nav.mcp'](),
              desc: m['settings.home.p_mcp_desc'](),
            },
            {
              href: '/settings/apikeys',
              icon: Key,
              label: m['settings.nav.apikeys'](),
              desc: m['settings.home.p_api_desc'](),
            },
          ].map((p) => (
            <Link key={p.href} href={p.href}>
              <Card className="hover:border-primary/40 h-full transition-colors">
                <CardContent className="py-4">
                  <p.icon className="text-primary mb-2 size-5" />
                  <div className="font-medium">{p.label}</div>
                  <div className="text-muted-foreground mt-1 text-xs">
                    {p.desc}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* 最近的 deck */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            {m['settings.home.recent']()}
          </h2>
          <Link
            href="/settings/decks"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
          >
            {m['settings.home.view_all']()} <ArrowRight className="size-3" />
          </Link>
        </div>
        <div className="grid gap-2">
          {decksData?.slice(0, 5).map((d) => (
            <Link key={d.id} href={`/settings/decks/${d.id}`}>
              <Card className="hover:border-primary/40 transition-colors">
                <CardContent className="flex items-center justify-between gap-3 py-3">
                  <span className="truncate text-sm font-medium">
                    {d.title}
                  </span>
                  <Badge
                    variant={d.status === 'published' ? 'default' : 'secondary'}
                  >
                    {d.status === 'published'
                      ? m['settings.decks.published']()
                      : m['settings.decks.draft']()}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
          {decksData && decksData.length === 0 && (
            <p className="text-muted-foreground text-sm">
              {m['settings.decks.empty']()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute('/settings/')({
  component: DashboardPage,
});
