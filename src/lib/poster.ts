// On-brand "lookbook poster" SVG generator — shared by the seed and the
// backoffice (auto-generates imagery for products created without photos).

import { PRODUCT_TYPE_LABELS, type ProductType } from "./enums";

function xml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const COND = "'Arial Narrow','Helvetica Neue',Arial,sans-serif";
const MONO = "'JetBrains Mono','SFMono-Regular',Consolas,monospace";

function chevrons(x: number, y: number, size: number, color: string, opacities: number[]): string {
  return opacities
    .map((op, i) => {
      const ox = x + i * size * 0.62;
      const s = size;
      return `<path d="M${ox} ${y} L${ox + s * 0.5} ${y + s * 0.5} L${ox} ${y + s}" fill="none" stroke="${color}" stroke-width="${s * 0.14}" stroke-linecap="square" opacity="${op}"/>`;
    })
    .join("");
}

function base(): string {
  return `<defs>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="70"/>
    </filter>
    <pattern id="grid" width="52" height="52" patternUnits="userSpaceOnUse">
      <path d="M52 0 L0 0 0 52" fill="none" stroke="#2C313A" stroke-width="1" opacity="0.5"/>
    </pattern>
  </defs>`;
}

export type PosterOpts = {
  brand: string;
  name: string;
  type: ProductType;
  colorHex: string;
  colorName: string;
};

function posterA(o: PosterOpts): string {
  const typeLabel = (PRODUCT_TYPE_LABELS[o.type] ?? o.type).toUpperCase();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1250" width="1000" height="1250">
  ${base()}
  <rect width="1000" height="1250" fill="#101216"/>
  <ellipse cx="760" cy="360" rx="360" ry="360" fill="${o.colorHex}" opacity="0.55" filter="url(#glow)"/>
  <rect width="1000" height="1250" fill="url(#grid)"/>
  <rect x="0" y="0" width="1000" height="1250" fill="none" stroke="#2C313A" stroke-width="2"/>
  ${chevrons(120, 470, 240, "#C6FF00", [1, 0.5, 0.22])}
  <g stroke="#5B616C" stroke-width="2">
    <path d="M40 40 h34 M40 40 v34"/><path d="M960 40 h-34 M960 40 v34"/>
    <path d="M40 1210 h34 M40 1210 v-34"/><path d="M960 1210 h-34 M960 1210 v-34"/>
  </g>
  <text x="56" y="80" font-family="${MONO}" font-size="22" letter-spacing="6" fill="#F4F5F7">${xml(o.brand)}</text>
  <text x="944" y="80" text-anchor="end" font-family="${MONO}" font-size="20" letter-spacing="4" fill="#8B929E">SS/26 · HUX</text>
  <text x="52" y="1120" font-family="${COND}" font-weight="800" font-size="260" letter-spacing="-6" fill="none" stroke="#F4F5F7" stroke-width="2" opacity="0.92">${xml(typeLabel)}</text>
  <line x1="56" y1="1150" x2="620" y2="1150" stroke="#2C313A" stroke-width="2"/>
  <text x="56" y="1188" font-family="${MONO}" font-size="22" letter-spacing="2" fill="#C3C8D1">${xml(o.name)}</text>
  <rect x="820" y="1158" width="26" height="26" rx="4" fill="${o.colorHex}" stroke="#2C313A"/>
  <text x="858" y="1178" font-family="${MONO}" font-size="20" fill="#8B929E">${xml(o.colorName)}</text>
</svg>`;
}

function posterB(o: PosterOpts): string {
  const words = o.name.toUpperCase().split(" ");
  const lines = words.length > 2 ? [words.slice(0, 2).join(" "), words.slice(2).join(" ")] : words;
  const typeLabel = (PRODUCT_TYPE_LABELS[o.type] ?? o.type).toUpperCase();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1250" width="1000" height="1250">
  ${base()}
  <rect width="1000" height="1250" fill="#0E1013"/>
  <polygon points="0,780 1000,420 1000,1250 0,1250" fill="${o.colorHex}" opacity="0.16"/>
  <ellipse cx="240" cy="960" rx="320" ry="320" fill="${o.colorHex}" opacity="0.4" filter="url(#glow)"/>
  <rect width="1000" height="1250" fill="url(#grid)"/>
  <rect x="0" y="0" width="1000" height="1250" fill="none" stroke="#2C313A" stroke-width="2"/>
  ${chevrons(560, 820, 300, "#C6FF00", [0.28, 0.16, 0.08])}
  <text x="56" y="80" font-family="${MONO}" font-size="22" letter-spacing="6" fill="#C6FF00">${xml(o.brand)}</text>
  <text x="944" y="80" text-anchor="end" font-family="${MONO}" font-size="20" letter-spacing="4" fill="#8B929E">${xml(typeLabel)}</text>
  ${lines
    .map(
      (ln, i) =>
        `<text x="56" y="${470 + i * 150}" font-family="${COND}" font-weight="800" font-size="150" letter-spacing="-3" fill="#F4F5F7">${xml(ln)}</text>`,
    )
    .join("")}
  <text x="56" y="${470 + lines.length * 150 + 30}" font-family="${MONO}" font-size="22" letter-spacing="3" fill="#8B929E">RUN · PERFORMANCE · LIFESTYLE</text>
  <text x="56" y="1200" font-family="${MONO}" font-size="20" fill="#5B616C">FIG.02 — ${xml(o.colorName.toUpperCase())}</text>
</svg>`;
}

export function posterVariants(o: PosterOpts): string[] {
  return [posterA(o), posterB(o)];
}
