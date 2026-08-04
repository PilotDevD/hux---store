import "server-only";
import { db } from "./db";
import { parseJson } from "./utils";
import { computePrice, getActivePromotions, type ActivePromotion } from "./pricing";
import type { Prisma } from "@prisma/client";

export type ProductCardData = {
  id: string;
  slug: string;
  brand: string;
  name: string;
  type: string;
  gender: string;
  price: number;
  compareAt: number | null;
  promotionName: string | null;
  image: string | null;
  hoverImage: string | null;
  soldOut: boolean;
  sizes: string[];
  createdAt: Date;
};

type ProductWithVariants = Prisma.ProductGetPayload<{ include: { variants: true } }>;

function toCard(p: ProductWithVariants, promos: ActivePromotion[]): ProductCardData {
  const { price, compareAt, promotionName } = computePrice(p, promos);
  const images = parseJson<string[]>(p.images, []);
  const totalStock = p.variants.reduce((s, v) => s + (v.active ? v.stock : 0), 0);
  const sizes = Array.from(
    new Set(p.variants.filter((v) => v.active && v.stock > 0).map((v) => v.size)),
  );
  return {
    id: p.id,
    slug: p.slug,
    brand: p.brand,
    name: p.name,
    type: p.type,
    gender: p.gender,
    price,
    compareAt,
    promotionName,
    image: images[0] ?? null,
    hoverImage: images[1] ?? images[0] ?? null,
    soldOut: totalStock <= 0,
    sizes,
    createdAt: p.createdAt,
  };
}

export async function getFeaturedProducts(limit = 8): Promise<ProductCardData[]> {
  const [products, promos] = await Promise.all([
    db.product.findMany({
      where: { active: true, featured: true },
      include: { variants: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    getActivePromotions(),
  ]);
  return products.map((p) => toCard(p, promos));
}

export async function getNewArrivals(limit = 8): Promise<ProductCardData[]> {
  const [products, promos] = await Promise.all([
    db.product.findMany({
      where: { active: true },
      include: { variants: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    getActivePromotions(),
  ]);
  return products.map((p) => toCard(p, promos));
}

export type ProductFilters = {
  brand?: string;
  type?: string;
  gender?: string;
  size?: string;
  collection?: string;
  search?: string;
  onlyPromo?: boolean;
  sort?: "recent" | "price-asc" | "price-desc";
};

export async function listProducts(filters: ProductFilters): Promise<ProductCardData[]> {
  const where: Prisma.ProductWhereInput = { active: true };
  if (filters.brand) where.brand = filters.brand;
  if (filters.type) where.type = filters.type;
  if (filters.gender) where.gender = filters.gender;
  if (filters.collection) where.collection = { slug: filters.collection };
  if (filters.size) where.variants = { some: { size: filters.size, stock: { gt: 0 }, active: true } };
  if (filters.search) {
    const s = filters.search;
    where.OR = [
      { name: { contains: s } },
      { modelName: { contains: s } },
      { description: { contains: s } },
      { brand: { contains: s } },
      { variants: { some: { sku: { contains: s } } } },
    ];
  }

  const [products, promos] = await Promise.all([
    db.product.findMany({ where, include: { variants: true }, orderBy: { createdAt: "desc" } }),
    getActivePromotions(),
  ]);

  let cards = products.map((p) => toCard(p, promos));

  if (filters.onlyPromo) cards = cards.filter((c) => c.compareAt && c.compareAt > c.price);

  switch (filters.sort) {
    case "price-asc":
      cards.sort((a, b) => a.price - b.price);
      break;
    case "price-desc":
      cards.sort((a, b) => b.price - a.price);
      break;
    default:
      cards.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  return cards;
}

export type ProductDetail = {
  id: string;
  slug: string;
  brand: string;
  name: string;
  modelName: string | null;
  type: string;
  gender: string;
  description: string | null;
  details: string | null;
  price: number;
  compareAt: number | null;
  promotionName: string | null;
  images: string[];
  collection: { slug: string; name: string } | null;
  variants: {
    id: string;
    size: string;
    color: string;
    colorHex: string | null;
    stock: number;
    price: number;
    sku: string;
  }[];
  colors: { name: string; hex: string | null }[];
  sizes: string[];
  totalStock: number;
};

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  const [p, promos] = await Promise.all([
    db.product.findUnique({
      where: { slug },
      include: { variants: { where: { active: true } }, collection: true },
    }),
    getActivePromotions(),
  ]);
  if (!p || !p.active) return null;

  const { price, compareAt, promotionName } = computePrice(p, promos);
  const images = parseJson<string[]>(p.images, []);

  const colorsMap = new Map<string, string | null>();
  for (const v of p.variants) if (!colorsMap.has(v.color)) colorsMap.set(v.color, v.colorHex);

  return {
    id: p.id,
    slug: p.slug,
    brand: p.brand,
    name: p.name,
    modelName: p.modelName,
    type: p.type,
    gender: p.gender,
    description: p.description,
    details: p.details,
    price,
    compareAt,
    promotionName,
    images,
    collection: p.collection ? { slug: p.collection.slug, name: p.collection.name } : null,
    variants: p.variants.map((v) => ({
      id: v.id,
      size: v.size,
      color: v.color,
      colorHex: v.colorHex,
      stock: v.stock,
      price: v.priceOverride ?? price,
      sku: v.sku,
    })),
    colors: Array.from(colorsMap.entries()).map(([name, hex]) => ({ name, hex })),
    sizes: Array.from(new Set(p.variants.map((v) => v.size))),
    totalStock: p.variants.reduce((s, v) => s + v.stock, 0),
  };
}

export type CollectionCard = {
  slug: string;
  name: string;
  description: string | null;
  cover: string | null;
  count: number;
};

export async function getCollectionsWithCover(): Promise<CollectionCard[]> {
  const collections = await db.collection.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    include: {
      products: {
        where: { active: true },
        take: 1,
        orderBy: { featured: "desc" },
        select: { images: true },
      },
      _count: { select: { products: { where: { active: true } } } },
    },
  });
  return collections.map((c) => {
    const imgs = parseJson<string[]>(c.products[0]?.images ?? "[]", []);
    return {
      slug: c.slug,
      name: c.name,
      description: c.description,
      cover: c.heroImage ?? imgs[0] ?? null,
      count: c._count.products,
    };
  });
}

export async function getRelatedProducts(
  brand: string,
  excludeId: string,
  limit = 4,
): Promise<ProductCardData[]> {
  const [products, promos] = await Promise.all([
    db.product.findMany({
      where: { active: true, brand, id: { not: excludeId } },
      include: { variants: true },
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    getActivePromotions(),
  ]);
  return products.map((p) => toCard(p, promos));
}
