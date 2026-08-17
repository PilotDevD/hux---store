// Seed catalog data — shared by the seeder and the poster generator.
// Prices are in REAIS here (converted to cents on insert).

export type SeedColor = { name: string; hex: string };
export type SeedProduct = {
  brand: "HAUSS" | "HOUND" | "SNUGG" | "HUX";
  name: string;
  modelName?: string;
  type:
    | "CAMISA" | "REGATA" | "TOP" | "CALCA" | "SHORT"
    | "JAQUETA" | "MOLETOM" | "MEIA" | "ACESSORIO";
  gender: "MASCULINO" | "FEMININO" | "UNISSEX";
  description: string;
  details: string;
  price: number; // reais
  compareAt?: number; // reais
  collection?: string; // collection slug
  featured?: boolean;
  colors: SeedColor[];
  sizes: string[];
};

export const COLLECTIONS = [
  {
    slug: "verao-2026",
    name: "Verão 2026",
    description: "Tecidos que respiram para o calor. Leveza máxima, secagem rápida.",
    sortOrder: 1,
  },
  {
    slug: "trail-series",
    name: "Trail Series",
    description: "Feito para a terra, a subida e o imprevisível. Resistência técnica.",
    sortOrder: 2,
  },
  {
    slug: "speed-lab",
    name: "Speed Lab",
    description: "Corte competitivo, gramatura mínima. Cada grama importa na prova.",
    sortOrder: 3,
  },
  {
    slug: "off-duty",
    name: "Off Duty",
    description: "O pós-treino. Conforto de rua com DNA de corrida.",
    sortOrder: 4,
  },
];

const APPAREL: string[] = ["PP", "P", "M", "G", "GG", "XG"];
const UNI: string[] = ["UNICO"];

const GRAPHITE = { name: "Grafite", hex: "#22262E" };
const ORANGE = { name: "Laranja HUX", hex: "#FF5C1A" };
const BLACK = { name: "Preto", hex: "#101216" };
const ASH = { name: "Cinza", hex: "#5B616C" };
const BONE = { name: "Off-white", hex: "#E7E3DA" };
const NAVY = { name: "Azul noite", hex: "#1C2A44" };
const MOSS = { name: "Verde musgo", hex: "#3A4A2F" };
const CORAL = { name: "Coral", hex: "#E5484D" };

export const PRODUCTS: SeedProduct[] = [
  // -------------------------------- HUX --------------------------------
  {
    brand: "HUX",
    name: "Camisa Ultramaratonista",
    modelName: "Ultramaratonista",
    type: "CAMISA",
    gender: "MASCULINO",
    description:
      "A camisa que aguenta o longo. Malha Dry-Fit furada com ventilação estratégica nas costas e laterais.",
    details:
      "Tecido Dry Fit furado · 92% poliamida / 8% elastano · Secagem ultrarrápida · Costura flatlock anti-atrito · Refletivos noturnos.",
    price: 219.9,
    collection: "speed-lab",
    featured: true,
    colors: [BLACK, ORANGE],
    sizes: APPAREL,
  },
  {
    brand: "HUX",
    name: "Regata Rage",
    modelName: "Rage",
    type: "REGATA",
    gender: "MASCULINO",
    description: "Regata de treino intenso. Cava ampla e tecido que não pesa quando molha.",
    details: "Tecido Fluid · Ultraleve (98g) · Anti-odor · Corte atlético.",
    price: 169.9,
    compareAt: 199.9,
    collection: "verao-2026",
    colors: [GRAPHITE, BONE],
    sizes: APPAREL,
  },
  {
    brand: "HUX",
    name: "Short Vento 5\"",
    modelName: "Vento",
    type: "SHORT",
    gender: "MASCULINO",
    description: "Short de corrida com liner interno e bolso zipado à prova de suor.",
    details: "Tecido Fluid · Liner com suporte · Bolso traseiro zipado · Cós elástico com cordão.",
    price: 159.9,
    collection: "speed-lab",
    colors: [BLACK, NAVY],
    sizes: APPAREL,
  },
  {
    brand: "HUX",
    name: "Top Aurora",
    modelName: "Aurora",
    type: "TOP",
    gender: "FEMININO",
    description: "Top de sustentação média com bojo removível. Alças que não marcam.",
    details: "Suplex Maxxi · Sustentação média · Bojo removível · Costas nadador.",
    price: 179.9,
    collection: "verao-2026",
    featured: true,
    colors: [ORANGE, BLACK, CORAL],
    sizes: ["PP", "P", "M", "G", "GG"],
  },
  {
    brand: "HUX",
    name: "Calça Legging Aurora",
    modelName: "Aurora",
    type: "CALCA",
    gender: "FEMININO",
    description: "Legging cintura alta com compressão progressiva e bolso lateral para o celular.",
    details: "Suplex Maxxi · Cintura alta · Compressão progressiva · Bolso lateral · Não-transparente.",
    price: 259.9,
    collection: "verao-2026",
    colors: [BLACK, GRAPHITE],
    sizes: ["PP", "P", "M", "G", "GG"],
  },
  {
    brand: "HUX",
    name: "Moletom Base",
    modelName: "Base",
    type: "MOLETOM",
    gender: "UNISSEX",
    description: "Moletom de aquecimento e recuperação. Felpa por dentro, toque seco por fora.",
    details: "Malha PV com felpa · Capuz forrado · Bolso canguru · Punhos ribana.",
    price: 319.9,
    collection: "off-duty",
    colors: [GRAPHITE, BONE],
    sizes: APPAREL,
  },

  // -------------------------------- HAUSS --------------------------------
  {
    brand: "HAUSS",
    name: "Jaqueta Trail Alpha",
    modelName: "Trail Alpha",
    type: "JAQUETA",
    gender: "UNISSEX",
    description: "Corta-vento ultraleve que cabe no bolso. Repele garoa e vento de trilha.",
    details: "Poliamida ripstop · Repelente à água (DWR) · Capuz ajustável · Dobra no próprio bolso · 118g.",
    price: 429.9,
    collection: "trail-series",
    featured: true,
    colors: [MOSS, BLACK, ORANGE],
    sizes: APPAREL,
  },
  {
    brand: "HAUSS",
    name: "Camisa Longrun",
    modelName: "Longrun",
    type: "CAMISA",
    gender: "MASCULINO",
    description: "Manga curta para quilometragem alta. Respiro constante em qualquer ritmo.",
    details: "Dry Fit furado · Painéis de ventilação · Refletivos 360° · Anti-odor.",
    price: 199.9,
    collection: "trail-series",
    colors: [NAVY, ASH],
    sizes: APPAREL,
  },
  {
    brand: "HAUSS",
    name: "Regata Longrun",
    modelName: "Longrun",
    type: "REGATA",
    gender: "FEMININO",
    description: "Regata solta de trilha com proteção UV e tecido que seca no vento.",
    details: "Tecido Fluid UV50+ · Corte solto · Barra assimétrica.",
    price: 159.9,
    collection: "trail-series",
    colors: [BONE, MOSS],
    sizes: ["PP", "P", "M", "G", "GG"],
  },
  {
    brand: "HAUSS",
    name: "Meia Grid Compressão",
    modelName: "Grid",
    type: "MEIA",
    gender: "UNISSEX",
    description: "Meia de compressão cano médio com zonas de amortecimento no impacto.",
    details: "Poliamida/elastano · Compressão graduada · Cano médio · Costura sem atrito.",
    price: 69.9,
    colors: [BLACK, ORANGE],
    sizes: UNI,
  },

  // -------------------------------- HOUND --------------------------------
  {
    brand: "HOUND",
    name: "Regata Sprint",
    modelName: "Sprint",
    type: "REGATA",
    gender: "MASCULINO",
    description: "Regata de prova. Corte agressivo, gramatura mínima, aerodinâmica pura.",
    details: "Tecido Fluid competition · 89g · Costura a laser · Corte race-fit.",
    price: 189.9,
    collection: "speed-lab",
    featured: true,
    colors: [CORAL, BLACK],
    sizes: APPAREL,
  },
  {
    brand: "HOUND",
    name: "Short Sprint Split",
    modelName: "Sprint",
    type: "SHORT",
    gender: "MASCULINO",
    description: "Split short clássico de pista. Liberdade total de passada.",
    details: "Fluid competition · Fenda lateral · Liner leve · Cós baixo.",
    price: 149.9,
    collection: "speed-lab",
    colors: [BLACK, CORAL],
    sizes: APPAREL,
  },
  {
    brand: "HOUND",
    name: "Top Velocity",
    modelName: "Velocity",
    type: "TOP",
    gender: "FEMININO",
    description: "Top de alta sustentação para tiros e intervalados. Trava e não escorrega.",
    details: "Suplex Maxxi · Sustentação alta · Ajuste nas costas · Bojo fixo.",
    price: 189.9,
    collection: "speed-lab",
    colors: [CORAL, BLACK],
    sizes: ["PP", "P", "M", "G", "GG"],
  },
  {
    brand: "HOUND",
    name: "Camisa Pace",
    modelName: "Pace",
    type: "CAMISA",
    gender: "UNISSEX",
    description: "Camisa de ritmo com tecnologia de resfriamento no contato com o suor.",
    details: "Dry Fit furado cooling · Refletivos · Corte reto unissex.",
    price: 209.9,
    compareAt: 239.9,
    collection: "speed-lab",
    colors: [GRAPHITE, ORANGE],
    sizes: APPAREL,
  },

  // -------------------------------- SNUGG --------------------------------
  {
    brand: "SNUGG",
    name: "Moletom Recovery",
    modelName: "Recovery",
    type: "MOLETOM",
    gender: "UNISSEX",
    description: "O moletom do pós-treino. Aconchego pesado, caimento oversized.",
    details: "Malha PV premium · Felpa densa · Oversized fit · Gola ampla.",
    price: 349.9,
    collection: "off-duty",
    featured: true,
    colors: [BONE, GRAPHITE, MOSS],
    sizes: APPAREL,
  },
  {
    brand: "SNUGG",
    name: "Camisa Sunday Oversized",
    modelName: "Sunday",
    type: "CAMISA",
    gender: "UNISSEX",
    description: "Camisa de algodão pima com caimento largo. Do alongamento ao café.",
    details: "Algodão pima · Caimento oversized · Gola reforçada · Estampa DTF discreta.",
    price: 129.9,
    collection: "off-duty",
    colors: [BONE, BLACK, ASH],
    sizes: APPAREL,
  },
  {
    brand: "SNUGG",
    name: "Calça Legging Cloud",
    modelName: "Cloud",
    type: "CALCA",
    gender: "FEMININO",
    description: "Legging de descanso ativo. Toque nuvem, cós que não aperta.",
    details: "Suplex soft · Cintura confortável · Costura minimalista.",
    price: 219.9,
    collection: "off-duty",
    colors: [ASH, BLACK],
    sizes: ["PP", "P", "M", "G", "GG"],
  },
  {
    brand: "SNUGG",
    name: "Meia Daily Crew",
    modelName: "Daily",
    type: "MEIA",
    gender: "UNISSEX",
    description: "Meia cano alto do dia a dia com toque acolchoado no calcanhar.",
    details: "Algodão/elastano · Cano alto · Reforço no calcanhar · Pack conceito.",
    price: 59.9,
    colors: [BONE, BLACK, ORANGE],
    sizes: UNI,
  },
  {
    brand: "SNUGG",
    name: "Jaqueta Loop",
    modelName: "Loop",
    type: "JAQUETA",
    gender: "UNISSEX",
    description: "Jaqueta de fleece leve para os dias frios de recuperação.",
    details: "Fleece reciclado · Zíper full · Bolsos laterais · Gola alta.",
    price: 389.9,
    collection: "off-duty",
    colors: [MOSS, GRAPHITE],
    sizes: APPAREL,
  },
];
