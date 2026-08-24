import "server-only";
import { db } from "./db";
import { BRANDS, BRAND_INFO } from "./enums";

export type BrandRow = { name: string; slug: string; tagline: string; blurb: string; accent: string };

const FALLBACK: BrandRow[] = BRANDS.map((b) => ({
  name: b, slug: b.toLowerCase(),
  tagline: BRAND_INFO[b].tagline, blurb: BRAND_INFO[b].blurb, accent: BRAND_INFO[b].accent,
}));

/** Active brands for the storefront (falls back to the built-in defaults). */
export async function getBrands(): Promise<BrandRow[]> {
  try {
    const rows = await db.brand.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    if (rows.length === 0) return FALLBACK;
    return rows.map((r) => ({
      name: r.name, slug: r.slug,
      tagline: r.tagline ?? "",
      blurb: r.blurb ?? "",
      accent: r.accent ?? "#C6FF00",
    }));
  } catch {
    return FALLBACK;
  }
}

/** Active brand names — for form selects / filters. */
export async function getBrandNames(): Promise<string[]> {
  try {
    const rows = await db.brand.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { name: true },
    });
    return rows.length ? rows.map((r) => r.name) : [...BRANDS];
  } catch {
    return [...BRANDS];
  }
}
