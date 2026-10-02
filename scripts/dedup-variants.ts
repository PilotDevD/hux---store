import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  const variants = await db.productVariant.findMany({ where: { active: true }, include: { product: { select: { name: true } } } });
  const groups = new Map<string, typeof variants>();
  for (const v of variants) {
    const k = `${v.productId}|${v.size}|${(v.color || "").toLowerCase().trim()}`;
    const arr = groups.get(k) ?? []; arr.push(v); groups.set(k, arr);
  }

  let merged = 0;
  for (const [, arr] of groups) {
    if (arr.length < 2) continue;
    // Keep the one with the most order items, tie-break oldest.
    const counts = await Promise.all(arr.map((v) => db.orderItem.count({ where: { variantId: v.id } })));
    let keepIdx = 0;
    for (let i = 1; i < arr.length; i++) {
      if (counts[i] > counts[keepIdx] || (counts[i] === counts[keepIdx] && arr[i].createdAt < arr[keepIdx].createdAt)) keepIdx = i;
    }
    const keep = arr[keepIdx];
    const others = arr.filter((_, i) => i !== keepIdx);
    const addStock = others.reduce((s, v) => s + v.stock, 0);

    await db.$transaction(async (tx) => {
      for (const b of others) {
        if (b.stock > 0) {
          await tx.stockMovement.create({ data: { variantId: b.id, type: "SAIDA", qty: b.stock, reason: `Merge de variante duplicada → ${keep.sku}` } });
          await tx.stockMovement.create({ data: { variantId: keep.id, type: "ENTRADA", qty: b.stock, reason: `Merge de variante duplicada (de ${b.sku})` } });
        }
        await tx.productVariant.update({ where: { id: b.id }, data: { stock: 0, active: false } });
      }
      if (addStock > 0) await tx.productVariant.update({ where: { id: keep.id }, data: { stock: { increment: addStock } } });
    });
    merged++;
    console.log(`MERGED ${keep.product.name} ${keep.size}/${keep.color} -> keep ${keep.sku} (stock ${keep.stock}+${addStock}), desativadas: ${others.map((o) => o.sku).join(", ")}`);
  }
  console.log(`grupos mesclados: ${merged}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
