import { ArrowRight } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { buttonVariants } from '@/components/ui/button';
import { DotPattern } from '@/components/ui/dot-pattern';

export function Hero() {
  return (
    <section className="relative isolate flex flex-col items-center justify-center overflow-hidden px-4 pt-24 pb-20 sm:pt-40 sm:pb-32">
      <DotPattern
        className={cn(
          '[mask-image:radial-gradient(ellipse_at_center,white,transparent_75%)]',
          'text-foreground/15'
        )}
      />
      <div className="fade-up relative max-w-3xl space-y-8 text-center">
        <p className="border-primary/30 bg-primary/10 text-primary mx-auto inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium">
          {m['landing.chips.auth']()} · {m['landing.chips.subscription']()} ·{' '}
          {m['landing.chips.rbac']()}
        </p>
        <h1 className="text-foreground text-5xl leading-[1.1] font-bold tracking-tight sm:text-6xl lg:text-7xl">
          {m['landing.hero.headline']()}
        </h1>
        <p className="text-muted-foreground mx-auto max-w-2xl text-lg leading-relaxed sm:text-xl">
          {m['landing.hero.subheadline']()}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
          <Link
            href="/settings"
            className={cn(
              buttonVariants({ size: 'lg' }),
              'brand-gradient h-12 gap-2 rounded-full border-0 px-8 text-white shadow-lg'
            )}
          >
            {m['landing.hero.cta']()}
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/settings"
            className={cn(
              buttonVariants({ variant: 'outline', size: 'lg' }),
              'h-12 rounded-full px-8'
            )}
          >
            {m['landing.hero.secondary']()}
          </Link>
        </div>
      </div>
    </section>
  );
}
