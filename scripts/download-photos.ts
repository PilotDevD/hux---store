/**
 * Applies real, on-topic running-apparel photos (Unsplash, free license) to
 * each product, mapped by product type. Photos are downloaded locally to
 * public/products/photos so they always load. The brand SVG poster is kept as
 * the last gallery image.
 *
 * Run: npm run db:photos
 *
 * The Unsplash photo IDs below were curated per category (running shirt, sports
 * bra, leggings, running shorts, jacket, hoodie, socks, running action).
 */
import { PrismaClient } from "@prisma/client";
import { mkdirSync, writeFileSync, readdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const db = new PrismaClient();

// ---- curated Unsplash photo ID pools (per category) ----
const POOLS: Record<string, string[]> = {
  SHIRT: ["1695918428487-7934244c19ac","1614660762109-bb0157fcbd7d","1686247166132-be2e27035108","1697663837192-797d28e564d8","1769867628125-f79281f22023","1542327821-87a5f0fb3c9f","1730282152835-db0b636d37a7","1766898211665-290ef71c1626","1764529192151-9e5b54050b5a","1535527096724-976ea149328d","1752778597829-9e92e6d8b42f"],
  TOP: ["1606902965551-dce093cda6e7","1682523426986-92746735ccc2","1604603565810-9f2a167d6b6e","1597297260448-3cc8d0a38388","1767958535526-10e31ae037a4","1768407683326-39eab5ffe373","1770026136858-6f12670dd131","1759476530926-f80b01cb6c27","1759476530777-8cb366bb6fc8"],
  LEGGING: ["1480179087180-d9f0ec044897","1617085606193-6b17105cff2a","1509833903111-9cb142f644e4","1644293230796-739c37cf4ffd","1702449414685-1ed9316b7253","1631899560971-394ded28a80f","1726195225009-56c724665a49","1649345946706-afbf86eee046","1619341680266-5aefe75d1fbd"],
  SHORT: ["1554139844-af2fc8ad3a3a","1695918425801-41dd27ed8277","1758922769578-68c5ba000d87","1695918425489-6c56df5eff9b","1602190420103-683df5093e86","1597892653980-3cec697283fe","1695918427235-2d6faaae356a","1695918425283-eb385c012b7a","1695918430535-775f1030f2d9"],
  JACKET: ["1486739985386-d4fae04ca6f7","1750830098526-8ff312f45b99","1560073742-bc295f81c3c0","1644769752255-e80980882aeb","1580060964435-03331a4e74a4","1536935672044-2bd5cf0999b1","1600872164524-072486994162","1513378628213-b8f36d8c2878","1611920507986-b41638a9054f","1509461641751-ed8c60422376"],
  HOODIE: ["1663573688938-2b3e7ea2ab33","1677538537484-324385aff147","1598403031105-32bb5e3f859a","1571821324176-52ff15e96348","1592485641225-bdbadeaa601e","1632073143817-8cd5b2165e20","1609332070449-5740d139468c","1634839325124-e69977f01b98","1612212136409-f14e05c7ed26","1551180452-c1bb9deebb0e"],
  SOCKS: ["1631180543602-727e1197619d","1597843797221-e34b4a320b97","1635342587676-13a5570e9101","1619575633397-fb4b20cc2465","1639753249870-ca3b0c380fd3","1580330573476-b4bb43d65563","1631024724206-6ccc65ab31bd","1629892679977-4a60230d1aab","1598151639582-8ea0d33cd8ce"],
  GENERAL: ["1594882645126-14020914d58d","1486218119243-13883505764c","1456613820599-bfe244172af5","1530143311094-34d807799e8f","1498581444814-7e44d2fbe0e2","1639843093167-ed40b985c01e","1522040942177-269680274214","1504025468847-0e438279542c","1623390003553-4fa3f9fceb89","1590646299178-1b26ab821e34","1588038265723-9bd2a2b03a82","1598702631024-b282c0fd96b2"],
};

const TYPE_TO_POOL: Record<string, string> = {
  CAMISA: "SHIRT",
  REGATA: "GENERAL",
  TOP: "TOP",
  LEGGING: "LEGGING",
  SHORT: "SHORT",
  JAQUETA: "JACKET",
  MOLETOM: "HOODIE",
  MEIA: "SOCKS",
  ACESSORIO: "GENERAL",
};

function unsplashUrl(id: string): string {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&h=1125&q=80`;
}

async function download(url: string, dest: string): Promise<boolean> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, redirect: "follow" });
    if (!res.ok) return false;
    if (!(res.headers.get("content-type") ?? "").startsWith("image/")) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 4000) return false;
    writeFileSync(dest, buf);
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const dir = join(process.cwd(), "public", "products", "photos");
  mkdirSync(dir, { recursive: true });

  // clean previous (random) jpgs
  for (const f of readdirSync(dir)) {
    if (f.endsWith(".jpg")) {
      try { unlinkSync(join(dir, f)); } catch {}
    }
  }

  const products = await db.product.findMany({ orderBy: { createdAt: "asc" } });
  console.log(`→ Baixando fotos reais (Unsplash) para ${products.length} produtos...`);

  const cursor: Record<string, number> = {};

  for (const p of products) {
    const poolKey = TYPE_TO_POOL[p.type] ?? "GENERAL";
    const pool = POOLS[poolKey];
    cursor[poolKey] = cursor[poolKey] ?? 0;

    // grab 2 successful photos, advancing through the pool (wrapping)
    const photos: string[] = [];
    let attempts = 0;
    while (photos.length < 2 && attempts < pool.length) {
      const id = pool[cursor[poolKey] % pool.length];
      cursor[poolKey]++;
      attempts++;
      const file = `${p.slug}-${photos.length + 1}.jpg`;
      const ok = await download(unsplashUrl(id), join(dir, file));
      if (ok) photos.push(`/products/photos/${file}`);
      process.stdout.write(ok ? "." : "x");
    }

    // keep one brand poster (svg) as the trailing gallery image
    let poster = `/products/${p.slug}-1.svg`;
    try {
      const svg = (JSON.parse(p.images) as string[]).find((s) => s.endsWith(".svg"));
      if (svg) poster = svg;
    } catch {}

    const images = [...photos, poster].filter(Boolean);
    if (photos.length === 0) continue; // keep existing if all downloads failed

    await db.product.update({ where: { id: p.id }, data: { images: JSON.stringify(images) } });
    console.log(` ${p.slug} (${poolKey}) → ${photos.length} foto(s)`);
  }

  console.log("✔ Fotos reais aplicadas.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
