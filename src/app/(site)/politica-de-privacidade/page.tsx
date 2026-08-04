import type { Metadata } from "next";

export const metadata: Metadata = { title: "Política de Privacidade" };

export default function PrivacidadePage() {
  return (
    <div className="container-hux max-w-3xl py-16 md:py-20">
      <p className="eyebrow mb-3">Legal</p>
      <h1 className="headline text-4xl md:text-5xl">Política de Privacidade</h1>
      <p className="mt-3 text-sm text-muted">Última atualização: 2026</p>

      <div className="mt-10 space-y-8 text-ink-soft">
        <section>
          <h2 className="headline mb-2 text-xl text-ink">1. Dados que coletamos</h2>
          <p className="leading-relaxed text-muted">
            Coletamos os dados que você fornece ao criar sua conta e finalizar pedidos: nome, e-mail,
            telefone e endereço de entrega. Registramos também seu histórico de compras para acompanhamento
            de pedidos e atendimento.
          </p>
        </section>
        <section>
          <h2 className="headline mb-2 text-xl text-ink">2. Como usamos seus dados</h2>
          <p className="leading-relaxed text-muted">
            Usamos seus dados para processar pedidos, calcular frete, enviar notificações sobre o status da
            compra e, quando autorizado, comunicar novidades e promoções. Nunca vendemos seus dados a terceiros.
          </p>
        </section>
        <section>
          <h2 className="headline mb-2 text-xl text-ink">3. Segurança</h2>
          <p className="leading-relaxed text-muted">
            Suas senhas são armazenadas de forma criptografada (hash) e nunca ficam visíveis. A comunicação
            com a loja é protegida e o acesso à sua conta é feito por sessão segura.
          </p>
        </section>
        <section>
          <h2 className="headline mb-2 text-xl text-ink">4. Seus direitos (LGPD)</h2>
          <p className="leading-relaxed text-muted">
            Você pode solicitar acesso, correção ou exclusão dos seus dados a qualquer momento pelo e-mail
            <a href="mailto:contato@hux.com.br" className="text-orange hover:underline"> contato@hux.com.br</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
