import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { COLLECTIONS, PRODUCTS, type SeedProduct } from "./catalog";
import { posterVariants } from "./svg";
import type { ProductType } from "../src/lib/enums";

const db = new PrismaClient();

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/["']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function hashStr(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return Math.abs(h);
}

const brandCode = (b: string) => b.slice(0, 2).toUpperCase();
const typeCode = (t: string) => t.slice(0, 3).toUpperCase();
const colorCode = (c: string) =>
  slugify(c).replace(/-/g, "").slice(0, 3).toUpperCase() || "STD";

async function main() {
  console.log("→ Limpando dados...");
  // Order matters (FKs).
  await db.orderEvent.deleteMany();
  await db.orderItem.deleteMany();
  await db.order.deleteMany();
  await db.cartItem.deleteMany();
  await db.cart.deleteMany();
  await db.stockMovement.deleteMany();
  await db.review.deleteMany();
  await db.notification.deleteMany();
  await db.productVariant.deleteMany();
  await db.product.deleteMany();
  await db.promotion.deleteMany();
  await db.coupon.deleteMany();
  await db.collection.deleteMany();
  await db.address.deleteMany();
  await db.customer.deleteMany();
  await db.user.deleteMany();
  await db.shippingRule.deleteMany();
  await db.contactMessage.deleteMany();
  await db.setting.deleteMany();

  // ------------------------------- staff --------------------------------
  console.log("→ Usuários do backoffice...");
  const adminUser = process.env.SEED_ADMIN_USERNAME || "admin";
  const adminPass = process.env.SEED_ADMIN_PASSWORD || "hux12345";
  await db.user.create({
    data: {
      username: adminUser,
      passwordHash: await bcrypt.hash(adminPass, 10),
      displayName: "Administrador",
      role: "ADMIN",
      permissions: "[]",
      commissionPct: 0,
    },
  });
  await db.user.create({
    data: {
      username: "gerente",
      passwordHash: await bcrypt.hash("hux12345", 10),
      displayName: "Marina Gestora",
      role: "GERENTE",
      permissions: "[]",
      commissionPct: 0,
    },
  });
  await db.user.create({
    data: {
      username: "vendedor",
      passwordHash: await bcrypt.hash("hux12345", 10),
      displayName: "Rafa Vendas",
      role: "VENDEDOR",
      permissions: JSON.stringify(["dashboard", "pedidos", "clientes"]),
      commissionPct: 5,
    },
  });

  // ------------------------------ collections ----------------------------
  console.log("→ Coleções...");
  const collectionIdBySlug = new Map<string, string>();
  for (const c of COLLECTIONS) {
    const created = await db.collection.create({
      data: {
        slug: c.slug,
        name: c.name,
        description: c.description,
        sortOrder: c.sortOrder,
      },
    });
    collectionIdBySlug.set(c.slug, created.id);
  }

  // ------------------------------- products ------------------------------
  console.log("→ Produtos, variantes e imagens...");
  const imgDir = join(process.cwd(), "public", "products");
  mkdirSync(imgDir, { recursive: true });

  let pIndex = 0;
  const createdProducts: { id: string; slug: string }[] = [];

  for (const p of PRODUCTS as SeedProduct[]) {
    pIndex++;
    const slug = slugify(`${p.brand}-${p.name}`);
    const primary = p.colors[0];

    // Generate + write the two poster images for this product.
    const posters = posterVariants({
      brand: p.brand,
      name: p.name,
      type: p.type as ProductType,
      colorHex: primary.hex,
      colorName: primary.name,
    });
    const imagePaths: string[] = [];
    posters.forEach((svg, i) => {
      const file = `${slug}-${i + 1}.svg`;
      writeFileSync(join(imgDir, file), svg, "utf8");
      imagePaths.push(`/products/${file}`);
    });

    const priceCents = Math.round(p.price * 100);
    const compareCents = p.compareAt ? Math.round(p.compareAt * 100) : null;
    const costCents = Math.round(priceCents * 0.52);

    const product = await db.product.create({
      data: {
        slug,
        brand: p.brand,
        name: p.name,
        modelName: p.modelName ?? null,
        type: p.type,
        gender: p.gender,
        description: p.description,
        details: p.details,
        basePrice: priceCents,
        compareAtPrice: compareCents,
        images: JSON.stringify(imagePaths),
        collectionId: p.collection ? collectionIdBySlug.get(p.collection) ?? null : null,
        featured: !!p.featured,
        active: true,
      },
    });
    createdProducts.push({ id: product.id, slug });

    // Variants = colors × sizes.
    let vi = 0;
    for (const color of p.colors) {
      for (const size of p.sizes) {
        vi++;
        const seedKey = `${slug}-${color.name}-${size}`;
        const stock = (hashStr(seedKey) % 16) + 3; // 3..18
        const sku = `${brandCode(p.brand)}-${typeCode(p.type)}-${size}-${colorCode(
          color.name,
        )}${String(pIndex).padStart(2, "0")}`;
        await db.productVariant.create({
          data: {
            productId: product.id,
            size,
            color: color.name,
            colorHex: color.hex,
            sku,
            stock,
            cost: costCents,
          },
        });
      }
    }
  }

  // ------------------------------ promotion ------------------------------
  console.log("→ Promoção e cupom...");
  const offDuty = collectionIdBySlug.get("off-duty");
  if (offDuty) {
    await db.promotion.create({
      data: {
        name: "Off Duty -15%",
        type: "PERCENT",
        value: 15,
        scope: "COLLECTION",
        collectionId: offDuty,
        active: true,
      },
    });
  }

  await db.coupon.create({
    data: {
      code: "BEMVINDO10",
      description: "10% de desconto na primeira compra.",
      type: "PERCENT",
      value: 10,
      minOrder: 15000,
      maxUses: null,
      perCustomerLimit: 1,
      active: true,
    },
  });
  await db.coupon.create({
    data: {
      code: "FRETEGRATIS",
      description: "Frete grátis em pedidos acima de R$ 250.",
      type: "FREE_SHIPPING",
      value: 0,
      minOrder: 25000,
      active: true,
    },
  });

  // ---------------------------- shipping rules ---------------------------
  console.log("→ Regras de frete...");
  await db.shippingRule.createMany({
    data: [
      {
        name: "Sudeste",
        matchType: "UF",
        ufList: JSON.stringify(["SP", "RJ", "MG", "ES"]),
        price: 1990,
        freeAbove: 29900,
        etaDays: 4,
        priority: 10,
      },
      {
        name: "Sul",
        matchType: "UF",
        ufList: JSON.stringify(["PR", "SC", "RS"]),
        price: 2490,
        freeAbove: 29900,
        etaDays: 5,
        priority: 10,
      },
      {
        name: "Centro-Oeste / Nordeste",
        matchType: "UF",
        ufList: JSON.stringify(["DF", "GO", "MT", "MS", "BA", "SE", "AL", "PE", "PB", "RN", "CE", "PI", "MA"]),
        price: 3290,
        freeAbove: 34900,
        etaDays: 7,
        priority: 10,
      },
      {
        name: "Norte",
        matchType: "UF",
        ufList: JSON.stringify(["AM", "PA", "AC", "RO", "RR", "AP", "TO"]),
        price: 3990,
        freeAbove: 39900,
        etaDays: 9,
        priority: 10,
      },
      {
        name: "Frete padrão nacional",
        matchType: "ALL",
        price: 2990,
        freeAbove: 34900,
        etaDays: 7,
        priority: 0,
      },
    ],
  });

  // ------------------------------- customer ------------------------------
  console.log("→ Cliente de demonstração...");
  const customer = await db.customer.create({
    data: {
      name: "Corredor Demo",
      email: "cliente@hux.com.br",
      passwordHash: await bcrypt.hash("hux12345", 10),
      phone: "11987654321",
    },
  });
  await db.address.create({
    data: {
      customerId: customer.id,
      label: "Casa",
      recipient: "Corredor Demo",
      cep: "01310100",
      street: "Av. Paulista",
      number: "1000",
      complement: "Apto 71",
      district: "Bela Vista",
      city: "São Paulo",
      state: "SP",
      isDefault: true,
    },
  });
  await db.notification.create({
    data: {
      customerId: customer.id,
      type: "SISTEMA",
      title: "Bem-vindo à HUX",
      body: "Sua conta está pronta. Explore os lançamentos e monte seu kit de corrida.",
      link: "/loja",
    },
  });

  // ------------------------------- settings ------------------------------
  await db.setting.create({
    data: {
      key: "store",
      value: JSON.stringify({
        freeShippingThreshold: 29900,
        supportEmail: "contato@hux.com.br",
        supportPhone: "11987654321",
        pixKey: process.env.PIX_KEY || "contato@hux.com.br",
      }),
    },
  });

  console.log(`✔ Seed concluído: ${createdProducts.length} produtos.`);
  console.log(`  Backoffice: ${adminUser} / ${adminPass}`);
  console.log(`  Cliente:    cliente@hux.com.br / hux12345`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
