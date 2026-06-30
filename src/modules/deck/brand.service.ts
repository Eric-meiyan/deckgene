import { and, desc, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import { db } from '@/core/db';
import { brand, type Brand } from '@/config/db/schema';

/**
 * Brand 服务（见 docs/PRD.md §5.1 / §9.6）。
 * brand = 可复用的视觉风格（palette/typography/tone）；白标核心。
 * 每个 user 仅一个 isActive=true。所有查询强制 userId 隔离。
 */

export interface BrandInput {
  name: string;
  sourceUrl?: string | null;
  palette?: Record<string, string> | null;
  typography?: Record<string, string> | null;
  tone?: string | null;
  logoUrl?: string | null;
}

export async function listBrands(userId: string): Promise<Brand[]> {
  return db()
    .select()
    .from(brand)
    .where(eq(brand.userId, userId))
    .orderBy(desc(brand.updatedAt));
}

export async function getBrand(
  id: string,
  userId: string
): Promise<Brand | null> {
  const [row] = await db()
    .select()
    .from(brand)
    .where(and(eq(brand.id, id), eq(brand.userId, userId)))
    .limit(1);
  return row ?? null;
}

export async function getActiveBrand(userId: string): Promise<Brand | null> {
  const [row] = await db()
    .select()
    .from(brand)
    .where(and(eq(brand.userId, userId), eq(brand.isActive, true)))
    .limit(1);
  return row ?? null;
}

export async function createBrand(
  userId: string,
  input: BrandInput
): Promise<Brand> {
  const [row] = await db()
    .insert(brand)
    .values({
      id: `brand_${nanoid(12)}`,
      userId,
      name: input.name,
      sourceUrl: input.sourceUrl,
      palette: input.palette,
      typography: input.typography,
      tone: input.tone,
      logoUrl: input.logoUrl,
      isActive: false,
    })
    .returning();
  return row;
}

export async function updateBrand(
  id: string,
  userId: string,
  patch: Partial<BrandInput>
): Promise<Brand | null> {
  const [row] = await db()
    .update(brand)
    .set(patch)
    .where(and(eq(brand.id, id), eq(brand.userId, userId)))
    .returning();
  return row ?? null;
}

export async function deleteBrand(
  id: string,
  userId: string
): Promise<boolean> {
  const rows = await db()
    .delete(brand)
    .where(and(eq(brand.id, id), eq(brand.userId, userId)))
    .returning({ id: brand.id });
  return rows.length > 0;
}

/** 设为工作区默认品牌（其余置 false）。 */
export async function setActiveBrand(
  id: string,
  userId: string
): Promise<Brand | null> {
  const target = await getBrand(id, userId);
  if (!target) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return db().transaction(async (tx: any) => {
    await tx
      .update(brand)
      .set({ isActive: false })
      .where(eq(brand.userId, userId));
    const [row] = await tx
      .update(brand)
      .set({ isActive: true })
      .where(and(eq(brand.id, id), eq(brand.userId, userId)))
      .returning();
    return row ?? null;
  });
}

/**
 * Brand Kernel：从 URL 提取品牌（palette/typography/tone）并创建 brand。
 * 启发式：meta theme-color / 高频非灰阶色 → primary；font-family → typography；
 * 正文片段经 LLM → tone。见 docs/PRD.md §9.5。
 */
export async function extractBrandFromUrl(
  userId: string,
  url: string
): Promise<Brand> {
  // 简单 SSRF 防护
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    throw new Error('invalid url');
  }
  if (!/^https?:$/.test(u.protocol)) throw new Error('only http(s) allowed');
  if (/^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.)/.test(u.hostname)) {
    throw new Error('blocked host');
  }

  const res = await fetch(u.toString(), {
    headers: { 'user-agent': 'deckgene-brand-kernel/1.0' },
  });
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  const html = (await res.text()).slice(0, 500_000);

  // primary：优先 meta theme-color，否则取高频非灰阶色
  const theme = html.match(
    /<meta[^>]+name=["']theme-color["'][^>]+content=["'](#[0-9a-fA-F]{3,6})["']/i
  );
  let primary = theme?.[1];
  if (!primary) {
    const counts = new Map<string, number>();
    for (const m of html.matchAll(/#([0-9a-fA-F]{6})\b/g)) {
      const hex = '#' + m[1].toLowerCase();
      const r = parseInt(m[1].slice(0, 2), 16);
      const g = parseInt(m[1].slice(2, 4), 16);
      const b = parseInt(m[1].slice(4, 6), 16);
      const gray = Math.abs(r - g) < 12 && Math.abs(g - b) < 12;
      const lum = (r + g + b) / 3;
      if (gray || lum < 24 || lum > 232) continue; // 跳过灰阶/极端
      counts.set(hex, (counts.get(hex) ?? 0) + 1);
    }
    primary = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  }
  primary = primary ?? '#25a18e';

  // typography：第一个 font-family
  const fontMatch = html.match(/font-family:\s*([^;"'}]+)/i);
  const headingFont = fontMatch
    ? fontMatch[1].split(',')[0].replace(/["']/g, '').trim()
    : 'Inter';

  // tone：正文片段 → LLM 一句话
  let tone: string | undefined;
  try {
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 2000);
    if (text.length > 50) {
      const { getLLMProvider } = await import('@/modules/ai/providers');
      tone = (
        await getLLMProvider().generateText({
          system:
            'You analyze brand voice. Reply with a SHORT phrase (<=20 chars) describing the brand tone, no quotes.',
          prompt: `Brand page text:\n${text}`,
        })
      )
        .trim()
        .slice(0, 60);
    }
  } catch {
    // tone 提取失败不阻断
  }

  // logo：apple-touch-icon → og:image → <link rel=icon>，解析为绝对地址
  function hrefIn(re: RegExp): string | undefined {
    const tag = html.match(re);
    return tag?.[0].match(/(?:href|content)=["']([^"']+)["']/i)?.[1];
  }
  const rawLogo =
    hrefIn(/<link[^>]*apple-touch-icon[^>]*>/i) ||
    hrefIn(/<meta[^>]*og:image[^>]*>/i) ||
    hrefIn(/<link[^>]*rel=["'][^"']*\bicon\b[^"']*["'][^>]*>/i);
  let logoUrl: string | undefined;
  if (rawLogo) {
    try {
      logoUrl = new URL(
        rawLogo.replace(/&amp;/g, '&'),
        u.toString()
      ).toString();
    } catch {
      // 忽略无法解析的 logo
    }
  }

  // 名称：og:site_name / <title> 友好名，回退 hostname
  const og = html.match(
    /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i
  );
  const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const rawName = (og?.[1] || titleTag?.[1] || '').trim();
  const name =
    rawName
      .split(/[|\-–—·]/)[0]
      .trim()
      .slice(0, 60) || u.hostname.replace(/^www\./, '');

  return createBrand(userId, {
    name,
    sourceUrl: u.toString(),
    palette: {
      primary,
      secondary: primary,
      background: '#ffffff',
      text: '#1a1a1a',
    },
    typography: { heading_font: headingFont, body_font: headingFont },
    tone,
    logoUrl,
  });
}

/** 序列化为对外 API 形状。 */
export function toApiBrand(b: Brand): Record<string, unknown> {
  return {
    id: b.id,
    name: b.name,
    source_url: b.sourceUrl,
    palette: b.palette,
    typography: b.typography,
    tone: b.tone,
    logo_url: b.logoUrl,
    is_active: b.isActive,
    created_at: b.createdAt,
    updated_at: b.updatedAt,
  };
}
