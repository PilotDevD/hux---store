import type { Metadata } from "next";

export const metadata: Metadata = { title: "Trocas & Devoluções" };

export default function TrocasPage() {
  return (
    <div className="container-hux max-w-3xl py-16 md:py-20">
      <p className="eyebrow mb-3">Ajuda</p>
      <h1 className="headline text-4xl md:text-5xl">Trocas & Devoluções</h1>

      <div className="mt-10 space-y-8 text-ink-soft">
        <section>
          <h2 className="headline mb-2 text-xl text-ink">Prazo de 30 dias</h2>
          <p className="leading-relaxed text-muted">
            Você tem até 30 dias corridos após o recebimento para solicitar troca ou devolução. A peça deve
            estar sem uso, com etiqueta e na embalagem original.
          </p>
        </section>
        <section>
          <h2 className="headline mb-2 text-xl text-ink">Como solicitar</h2>
          <ol className="space-y-2 leading-relaxed text-muted">
            <li>1. Acesse <strong className="text-ink-soft">Minha conta → Pedidos</strong> e localize o pedido.</li>
            <li>2. Fale com a gente pelo WhatsApp ou e-mail informando o número do pedido.</li>
            <li>3. Enviamos o código de postagem para a devolução.</li>
            <li>4. Após recebermos e conferirmos a peça, processamos a troca ou o reembolso.</li>
          </ol>
        </section>
        <section>
          <h2 className="headline mb-2 text-xl text-ink">Primeira troca grátis</h2>
          <p className="leading-relaxed text-muted">
            A primeira troca por tamanho é por nossa conta. Para trocas seguintes ou devoluções por
            desistência, o frete de retorno fica por conta do cliente.
          </p>
        </section>
        <section>
          <h2 className="headline mb-2 text-xl text-ink">Reembolso</h2>
          <p className="leading-relaxed text-muted">
            Pagamentos via Pix são reembolsados na mesma chave em até 5 dias úteis após a aprovação da
            devolução.
          </p>
        </section>
      </div>
    </div>
  );
}
