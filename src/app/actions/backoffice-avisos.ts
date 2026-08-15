"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireModule } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { sendEmail, backInStockEmail } from "@/lib/mailer";

/** Notify all pending "avise-me" requests for a product that it's back in stock. */
export async function notifyBackInStockAction(productId: string): Promise<{ ok: boolean; error?: string; emailed?: number; skipped?: boolean }> {
  const staff = await requireModule("avisos");
  const [product, requests] = await Promise.all([
    db.product.findUnique({ where: { id: productId }, select: { name: true, slug: true } }),
    db.stockNotifyRequest.findMany({ where: { productId, notified: false } }),
  ]);
  if (!product) return { ok: false, error: "Produto não encontrado." };
  if (requests.length === 0) return { ok: false, error: "Nenhuma solicitação pendente." };

  const base = process.env.NEXT_PUBLIC_SITE_URL || "";
  const { subject, html } = backInStockEmail(product.name, `${base}/produto/${product.slug}`);

  let emailed = 0;
  let anySkipped = false;
  for (const r of requests) {
    const sent = await sendEmail({ to: r.email, subject, html });
    if (sent.ok) emailed++;
    if (sent.skipped) anySkipped = true;
  }
  await db.stockNotifyRequest.updateMany({ where: { productId, notified: false }, data: { notified: true, notifiedAt: new Date() } });

  await logAudit({ staff, action: "SEND", entity: "Avise-me", entityId: productId, summary: `Notificou ${requests.length} cliente(s) sobre "${product.name}"${anySkipped ? " (e-mail não configurado)" : ""}` });
  revalidatePath("/backoffice/avisos");
  return { ok: true, emailed, skipped: anySkipped };
}

export async function dismissBackInStockAction(productId: string): Promise<{ ok: boolean }> {
  const staff = await requireModule("avisos");
  await db.stockNotifyRequest.updateMany({ where: { productId, notified: false }, data: { notified: true, notifiedAt: new Date() } });
  await logAudit({ staff, action: "UPDATE", entity: "Avise-me", entityId: productId, summary: "Marcou solicitações como resolvidas" });
  revalidatePath("/backoffice/avisos");
  return { ok: true };
}
