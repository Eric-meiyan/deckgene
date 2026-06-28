import {
  Download,
  Palette,
  Plug,
  ShieldCheck,
  Sparkles,
  Tag,
  type LucideIcon,
} from 'lucide-react';

import { tDynamic } from '@/core/i18n/dynamic';
import { m } from '@/paraglide/messages.js';

export function Features() {
  const features: { key: string; icon: LucideIcon }[] = [
    { key: 'generate', icon: Sparkles },
    { key: 'brand', icon: Palette },
    { key: 'api', icon: Plug },
    { key: 'whitelabel', icon: Tag },
    { key: 'privacy', icon: ShieldCheck },
    { key: 'export', icon: Download },
  ];

  return (
    <section id="features" className="px-4 py-24 sm:py-32">
      <div className="mx-auto max-w-5xl">
        <div className="mb-20 text-center">
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
            {m['landing.features.title']()}
          </h2>
          <p className="text-muted-foreground mx-auto mt-5 max-w-lg">
            {m['landing.features.description']()}
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ key, icon: Icon }) => (
            <div
              key={key}
              className="group border-border bg-card hover:border-primary/40 relative flex flex-col gap-4 rounded-[28px] border p-6 transition-all hover:shadow-md"
            >
              <div className="bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground inline-flex size-11 items-center justify-center rounded-2xl transition-colors">
                <Icon className="size-5" strokeWidth={1.75} />
              </div>
              <div className="space-y-2">
                <h3 className="font-medium">
                  {tDynamic(`landing.features.${key}.title`)}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {tDynamic(`landing.features.${key}.description`)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
