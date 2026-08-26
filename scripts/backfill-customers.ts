import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

function parse(s: string): { name?: string; email?: string; phone?: string } {
  try { return JSON.parse(s || "{}"); } catch { return {}; }
}

async function main() {
  const orders = await db.order.findMany({
    where: { customerId: null },
    select: { id: true, number: true, customerSnapshot: true },
  });
  let created = 0, linked = 0, skipped = 0;
  for (const o of orders) {
    const snap = parse(o.customerSnapshot);
    const name = (snap.name || "").trim();
    if (!name) { skipped++; continue; }
    const email = (snap.email || "").trim().toLowerCase() || null;
    const phone = (snap.phone ? String(snap.phone) : "").replace(/\D/g, "") || null;

    let cust = null as { id: string } | null;
    if (email) cust = await db.customer.findUnique({ where: { email }, select: { id: true } });
    if (!cust && phone) cust = await db.customer.findFirst({ where: { phone, name }, select: { id: true } });
    if (!cust) cust = await db.customer.findFirst({ where: { name, phone: phone ?? undefined }, select: { id: true } });
    if (!cust) {
      cust = await db.customer.create({ data: { name, email, phone, origin: "BALCAO" }, select: { id: true } });
      created++;
    } else {
      linked++;
    }
    await db.order.update({ where: { id: o.id }, data: { customerId: cust.id } });
  }
  console.log("BACKFILL_RESULT " + JSON.stringify({ totalUnlinked: orders.length, created, linked, skipped }));
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
