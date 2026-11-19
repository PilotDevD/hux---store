/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Types are validated separately via `tsc --noEmit`; don't block builds on lint.
    ignoreDuringBuilds: true,
  },
  images: {
    // Produtos importados têm fotos em CDNs externos arbitrários (e alguns
    // registros antigos trazem caminhos inválidos). O otimizador do next/image
    // valida o host e LANÇA erro (HTTP 500) para qualquer host não listado,
    // derrubando a loja inteira. Desligar a otimização renderiza a imagem como
    // <img> normal — sem validação de host e sem quebrar a página.
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
