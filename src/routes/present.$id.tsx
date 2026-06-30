import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';

import { useRouter } from '@/core/i18n/navigation';
import { apiGet } from '@/lib/api-client';
import { DeckPlayer } from '@/components/deck/deck-player';
import { brandStyle } from '@/components/deck/deck-renderer';

interface SlideDTO {
  id: string;
  slide_type: string;
  content: Record<string, unknown>;
}
interface DeckDTO {
  id: string;
  title: string;
  brand_id: string | null;
  slides: SlideDTO[];
}
interface BrandDTO {
  id: string;
  palette: Record<string, string> | null;
  typography: Record<string, string> | null;
  logo_url: string | null;
}

function PresentPage() {
  const { id } = Route.useParams();
  const router = useRouter();
  const deckQ = useQuery({
    queryKey: ['deck', id],
    queryFn: () => apiGet<DeckDTO>(`/api/decks/${id}`),
  });
  const brandsQ = useQuery({
    queryKey: ['brands'],
    queryFn: () => apiGet<BrandDTO[]>('/api/brands'),
  });

  const deck = deckQ.data;
  const brand = brandsQ.data?.find((b) => b.id === deck?.brand_id) ?? null;

  if (!deck) return <div className="py-12 text-center">…</div>;
  return (
    <DeckPlayer
      title={deck.title}
      slides={deck.slides}
      style={brandStyle(brand)}
      onExit={() => router.push(`/settings/decks/${id}`)}
    />
  );
}

export const Route = createFileRoute('/present/$id')({
  component: PresentPage,
});
