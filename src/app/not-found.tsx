import Link from "next/link";
import { Logo } from "@/components/site/logo";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-graphite px-5">
      <div className="tech-grid pointer-events-none absolute inset-0 opacity-30" />
      <div className="glow-orange pointer-events-none absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 opacity-40" />
      <div className="relative text-center">
        <Link href="/" className="mb-10 inline-block"><Logo /></Link>
        <p className="font-display text-[24vw] leading-none text-stroke-orange md:text-[16rem]">404</p>
        <h1 className="headline mt-2 text-3xl">Você saiu da rota</h1>
        <p className="mx-auto mt-3 max-w-sm text-muted">
          Essa página não existe ou foi movida. Volte para a pista.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/" className="btn btn-primary">Início</Link>
          <Link href="/loja" className="btn btn-ghost">Ir para a loja</Link>
        </div>
      </div>
    </div>
  );
}
