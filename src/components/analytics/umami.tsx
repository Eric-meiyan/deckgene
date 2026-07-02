// Umami analytics — rendered as a native <script> so the tag lands in the SSR
// HTML directly (same rationale as analytics/plausible.tsx). async flags it to
// React 19 as a hoistable resource.
export function Umami({
  websiteId,
  src = 'https://analytics.umami.is/script.js',
}: {
  websiteId: string;
  src?: string;
}) {
  if (!websiteId) return null;
  return (
    <script
      id="umami-loader"
      src={src}
      data-website-id={websiteId}
      defer
      async
    />
  );
}
