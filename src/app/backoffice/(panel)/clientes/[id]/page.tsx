import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Mail, MessageCircle, ShoppingBag, ClipboardList, Briefcase } from "lucide-react";
import { guardModule } from "@/lib/bo-guard";
import { db } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { formatDate, onlyDigits, initials } from "@/lib/utils";
import { PRODUCT_TYPE_LABELS } from "@/lib/enums";
import { PageHeader, StatCard } from "@/components/backoffice/bo-ui";
import { Badge } from "@/components/ui/badge";
import { ClienteFormButton } from "@/components/backoffice/cliente-form-button";

export const metadata: Metadata = { title: "Cliente" };

export default async function ClienteDetail({ params }: { params: Promise<{ id: string }> }) {
  await guardModule("clientes");
  const { id } = await params;

  const customer = await db.customer.findUnique({
    where: { id },
    include: {
      orders: { orderBy: { createdAt: "desc" }, include: { items: { select: { id: true } } } },
      addresses: true,
    },
  });
  if (!customer) notFound();

  const paid = customer.orders.filter((o) => o.paymentStatus === "CONFIRMADO");
  const spent = paid.reduce((s, o) => s + o.total, 0);
  const ticket = paid.length ? Math.round(spent / paid.length) : 0;
  const phone = onlyDigits(customer.phone ?? "");

  // History beyond orders: encomendas + malas matched by name (and phone).
  const nameFilter = { equals: customer.name, mode: "insensitive" as const };
  const [backorders, malas] = await Promise.all([
    db.backorder.findMany({
      where: { OR: [{ customerName: nameFilter }, ...(phone ? [{ customerPhone: { contains: phone } }] : [])] },
      orderBy: { createdAt: "desc" },
    }),
    db.mala.findMany({
      where: { customerName: nameFilter },
      orderBy: { createdAt: "desc" },
      include: { items: { select: { id: true } } },
    }),
  ]);

  return (
    <>
      <Link href="/backoffice/clientes" className="mb-5 inline-flex items-center gap-1.5 font-mono text-xs text-faint hover:text-orange">
        <ChevronLeft size={14} /> Voltar
      </Link>

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="grid size-14 place-items-center rounded-full bg-elevated font-display text-lg text-orange">{initials(customer.name)}</div>
        <div className="flex-1">
          <h1 className="headline text-3xl">{customer.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-4 text-sm">
            {customer.email
              ? <a href={`mailto:${customer.email}`} className="flex items-center gap-1.5 text-ink-soft hover:text-orange"><Mail size={14} /> {customer.email}</a>
              : <span className="flex items-center gap-1.5 text-faint"><Mail size={14} /> sem e-mail</span>}
            {phone && <a href={`https://wa.me/55${phone}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-ink-soft hover:text-positive"><MessageCircle size={14} /> {customer.phone}</a>}
            {customer.origin === "BALCAO" && <span className="rounded bg-elevated px-1.5 py-0.5 text-[0.6rem] font-medium uppercase text-muted">Balcão</span>}
          </div>
        </div>
        <ClienteFormButton
          initial={{ id: customer.id, name: customer.name, email: customer.email ?? "", phone: customer.phone ?? "", cpf: customer.cpf ?? "" }}
          variant="ghost"
        />
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Pedidos pagos" value={String(paid.length)} icon={ShoppingBag} />
        <StatCard label="Total gasto" value={formatCents(spent)} tone="positive" />
        <StatCard label="Ticket médio" value={formatCents(ticket)} tone="info" />
      </div>

      <PageHeader title="Histórico de pedidos" />
      {customer.orders.length === 0 ? (
        <p className="card p-8 text-center text-sm text-muted">Nenhum pedido ainda.</p>
      ) : (
        <div className="card divide-y divide-line">
          {customer.orders.map((o) => {
            const payTone = o.paymentStatus === "CONFIRMADO" ? "success" : o.paymentStatus === "ESTORNADO" ? "danger" : "warning";
            const payLabel = o.paymentStatus === "CONFIRMADO" ? "Pago" : o.paymentStatus === "ESTORNADO" ? "Estornado" : "Pendente";
            const isAprazo = o.paymentMethod === "A_PRAZO";
            return (
              <Link key={o.number} href={`/backoffice/pedidos/${o.number}`} className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-elevated">
                <div>
                  <p className="font-mono text-sm font-semibold">{o.number}</p>
                  <p className="text-xs text-muted">{formatDate(o.createdAt)} · {o.items.length} itens{isAprazo ? " · a prazo" : ""}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={payTone}>{payLabel}</Badge>
                  <span className="hidden font-semibold sm:block">{formatCents(o.total)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Encomendas */}
      <div className="mt-8">
        <PageHeader title="Encomendas" subtitle={`${backorders.length} registro(s)`} />
        {backorders.length === 0 ? (
          <p className="card p-6 text-center text-sm text-muted">Nenhuma encomenda para este cliente.</p>
        ) : (
          <div className="card divide-y divide-line">
            {backorders.map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 truncate text-sm font-medium">
                    <ClipboardList size={14} className="shrink-0 text-faint" />
                    {b.brand ? `${b.brand} ` : ""}{PRODUCT_TYPE_LABELS[b.productType as keyof typeof PRODUCT_TYPE_LABELS] ?? b.productType}{b.modelName ? ` ${b.modelName}` : ""}
                  </p>
                  <p className="font-mono text-xs text-muted">{b.size} · {b.color} · {b.qty}x · {formatDate(b.createdAt)}</p>
                </div>
                <Badge tone={b.status === "CONCLUIDA" ? "success" : b.status === "CANCELADA" ? "neutral" : "warning"}>{b.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Malas HUX */}
      {malas.length > 0 && (
        <div className="mt-8">
          <PageHeader title="Malas HUX" subtitle={`${malas.length} registro(s)`} />
          <div className="card divide-y divide-line">
            {malas.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 truncate text-sm font-medium">
                    <Briefcase size={14} className="shrink-0 text-faint" /> Mala · {m.items.length} itens
                  </p>
                  <p className="font-mono text-xs text-muted">enviada {formatDate(m.createdAt)}{m.orderNumber ? ` · pedido ${m.orderNumber}` : ""}</p>
                </div>
                <Badge tone={m.status === "FINALIZADA" ? "success" : m.status === "CANCELADA" ? "neutral" : "warning"}>{m.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
