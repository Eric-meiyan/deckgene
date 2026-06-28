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
