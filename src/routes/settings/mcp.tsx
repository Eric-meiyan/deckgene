import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Check, Copy, Key } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const TOOLS = [
  'generate_deck',
  'list_decks',
  'get_deck',
  'publish_deck',
  'list_slide_templates',
  'list_brands',
  'set_active_brand',
  'generate_image',
];

function CopyBtn({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      size="sm"
      variant="outline"
      className="gap-1"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
    >
      {done ? <Check className="size-3" /> : <Copy className="size-3" />}
      {done ? m['settings.mcp.copied']() : m['settings.mcp.copy']()}
    </Button>
  );
}

function McpPage() {
  const endpoint = `${envConfigs.app_url}/api/mcp`;
  const cmd = `claude mcp add --transport http deckgene ${endpoint} \\\n  --header "Authorization: Bearer hd_live_YOUR_KEY"`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{m['settings.mcp.title']()}</h1>
        <p className="text-muted-foreground text-sm">
          {m['settings.mcp.subtitle']()}
        </p>
      </div>

      <Card>
        <CardContent className="space-y-2 py-4">
          <div className="text-sm font-medium">
            {m['settings.mcp.endpoint']()}
          </div>
          <div className="flex items-center gap-2">
            <code className="bg-muted flex-1 truncate rounded px-3 py-2 text-sm">
              {endpoint}
            </code>
            <CopyBtn text={endpoint} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 py-4">
          <div className="text-sm font-medium">
            {m['settings.mcp.connect']()}
          </div>
          <p className="text-muted-foreground text-xs">
            {m['settings.mcp.connect_desc']()}
          </p>
          <div className="flex items-start gap-2">
            <pre className="bg-muted flex-1 overflow-auto rounded p-3 text-xs">
              {cmd}
            </pre>
            <CopyBtn text={cmd} />
          </div>
          <div className="flex items-center gap-2">
            <p className="text-muted-foreground text-xs">
              {m['settings.mcp.need_key']()}
            </p>
            <Link
              href="/settings/apikeys"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                'gap-1'
              )}
            >
              <Key className="size-3" />
              {m['settings.nav.apikeys']()}
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 py-4">
          <div className="text-sm font-medium">{m['settings.mcp.tools']()}</div>
          <div className="flex flex-wrap gap-2">
            {TOOLS.map((t) => (
              <Badge key={t} variant="secondary" className="font-mono">
                {t}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export const Route = createFileRoute('/settings/mcp')({
  component: McpPage,
});
