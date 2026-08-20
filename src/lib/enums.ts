// Domain enums / fixed lists — single source of truth.
// SQLite has no native enums, so these back the String columns and all
// validation + UI labels. Values are stored verbatim in the DB.

export const ROLES = ["ADMIN", "GERENTE", "VENDEDOR"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrador",
  GERENTE: "Gerente",
  VENDEDOR: "Vendedor",
};

export const BRANDS = ["HAUSS", "HOUND", "SNUGG", "HUX"] as const;
export type Brand = (typeof BRANDS)[number];

export const GENDERS = ["MASCULINO", "FEMININO", "UNISSEX"] as const;
export type Gender = (typeof GENDERS)[number];

export const GENDER_LABELS: Record<Gender, string> = {
  MASCULINO: "Masculino",
  FEMININO: "Feminino",
  UNISSEX: "Unissex",
};

export const PRODUCT_TYPES = [
  "CAMISA",
  "REGATA",
  "TOP",
  "CALCA",
  "SHORT",
  "JAQUETA",
  "MOLETOM",
  "MEIA",
  "ACESSORIO",
] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  CAMISA: "Camisa",
  REGATA: "Regata",
  TOP: "Top",
  CALCA: "Calça",
  SHORT: "Short",
  JAQUETA: "Jaqueta",
  MOLETOM: "Moletom",
  MEIA: "Meia",
  ACESSORIO: "Acessório",
};

// Compat: produtos antigos podem ter type "LEGGING" — mapeia para o label novo.
PRODUCT_TYPE_LABELS["LEGGING" as ProductType] = "Calça";

export const SIZES = ["PP", "P", "M", "G", "GG", "XG", "UNICO"] as const;
export type Size = (typeof SIZES)[number];

export const SIZE_LABELS: Record<Size, string> = {
  PP: "PP",
  P: "P",
  M: "M",
  G: "G",
  GG: "GG",
  XG: "XG",
  UNICO: "Único",
};

// Relative fabric-consumption weight per size (from spec ch.16) — kept for
// future Confecção/costing use.
export const SIZE_WEIGHTS: Record<Size, number> = {
  PP: 0.8,
  P: 0.9,
  M: 1.0,
  G: 1.15,
  GG: 1.3,
  XG: 1.45,
  UNICO: 1.0,
};

export const ORDER_STATUSES = [
  "AGUARDANDO_PAGAMENTO",
  "PAGO",
  "EM_SEPARACAO",
  "ENVIADO",
  "ENTREGUE",
  "CANCELADO",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  AGUARDANDO_PAGAMENTO: "Aguardando pagamento",
  PAGO: "Pagamento confirmado",
  EM_SEPARACAO: "Em separação",
  ENVIADO: "Enviado",
  ENTREGUE: "Entregue",
  CANCELADO: "Cancelado",
};

// Semantic color token per status (maps to CSS classes in the UI).
export const ORDER_STATUS_TONE: Record<OrderStatus, "warning" | "info" | "success" | "danger" | "neutral"> = {
  AGUARDANDO_PAGAMENTO: "warning",
  PAGO: "info",
  EM_SEPARACAO: "info",
  ENVIADO: "info",
  ENTREGUE: "success",
  CANCELADO: "danger",
};

// Ordered lifecycle used to render progress timelines (CANCELADO is out-of-line).
export const ORDER_FLOW: OrderStatus[] = [
  "AGUARDANDO_PAGAMENTO",
  "PAGO",
  "EM_SEPARACAO",
  "ENVIADO",
  "ENTREGUE",
];

export const PAYMENT_STATUSES = ["PENDENTE", "CONFIRMADO", "ESTORNADO"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHODS = ["PIX_MANUAL", "BOLETO", "CARTAO", "DINHEIRO", "DEBITO", "A_PRAZO"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  PIX_MANUAL: "Pix",
  BOLETO: "Boleto bancário",
  CARTAO: "Cartão de crédito",
  DINHEIRO: "Dinheiro",
  DEBITO: "Cartão de débito",
  A_PRAZO: "A prazo (crediário)",
};

// Methods available when a staff member registers a physical/manual sale.
export const MANUAL_PAYMENT_METHODS = ["DINHEIRO", "PIX_MANUAL", "DEBITO", "CARTAO", "A_PRAZO"] as const;

export const SALE_CHANNELS = ["ONLINE", "MANUAL"] as const;
export type SaleChannel = (typeof SALE_CHANNELS)[number];
export const SALE_CHANNEL_LABELS: Record<string, string> = {
  ONLINE: "Loja online",
  MANUAL: "Venda física",
};

export const MALA_STATUSES = ["COM_CLIENTE", "FINALIZADA", "CANCELADA"] as const;
export const MALA_STATUS_LABELS: Record<string, string> = {
  COM_CLIENTE: "Com o cliente",
  FINALIZADA: "Finalizada",
  CANCELADA: "Cancelada",
};
export const MALA_DECISIONS = ["PENDENTE", "COMPROU", "DEVOLVEU"] as const;

export const PRODUCTION_PHASES = ["CONFECCAO", "ESTAMPARIA", "FINALIZADA"] as const;
export type ProductionPhase = (typeof PRODUCTION_PHASES)[number];
export const PRODUCTION_PHASE_LABELS: Record<string, string> = {
  CONFECCAO: "Na costureira",
  ESTAMPARIA: "Na estamparia",
  FINALIZADA: "Confecção finalizada",
};

export const EXPENSE_TYPES = ["UNICA", "PARCELADA"] as const;
export const EXPENSE_CATEGORIES = [
  "ALUGUEL", "AGUA_LUZ_INTERNET", "SALARIOS", "FORNECEDORES",
  "MARKETING", "MANUTENCAO", "IMPOSTOS", "OUTROS",
] as const;
export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  ALUGUEL: "Aluguel",
  AGUA_LUZ_INTERNET: "Água/Luz/Internet",
  SALARIOS: "Salários",
  FORNECEDORES: "Fornecedores",
  MARKETING: "Marketing",
  MANUTENCAO: "Manutenção",
  IMPOSTOS: "Impostos",
  OUTROS: "Outros",
};

export const RETURN_TYPES = ["DEVOLUCAO", "TROCA"] as const;
export type ReturnType = (typeof RETURN_TYPES)[number];
export const RETURN_TYPE_LABELS: Record<string, string> = {
  DEVOLUCAO: "Devolução",
  TROCA: "Troca",
};
export const RETURN_ITEM_MODES = ["DEVOLVER", "TROCAR"] as const;

export const INSTALLMENT_STATUSES = ["PENDENTE", "PAGO", "CANCELADO"] as const;
export type InstallmentStatus = (typeof INSTALLMENT_STATUSES)[number];

export const RESERVATION_STATUSES = ["ATIVA", "FINALIZADA", "CANCELADA"] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export const BACKORDER_STATUSES = ["PENDENTE", "CONCLUIDA", "CANCELADA"] as const;
export type BackorderStatus = (typeof BACKORDER_STATUSES)[number];

export const COUPON_TYPES = ["PERCENT", "FIXED", "FREE_SHIPPING"] as const;
export type CouponType = (typeof COUPON_TYPES)[number];

export const PROMOTION_TYPES = ["PERCENT", "FIXED"] as const;
export type PromotionType = (typeof PROMOTION_TYPES)[number];

export const PROMOTION_SCOPES = ["PRODUCT", "BRAND", "COLLECTION", "ALL"] as const;
export type PromotionScope = (typeof PROMOTION_SCOPES)[number];

export const MOVEMENT_TYPES = ["ENTRADA", "SAIDA"] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export const NOTIFICATION_TYPES = ["PEDIDO", "PROMO", "SISTEMA"] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

// Backoffice modules (permission matrix for VENDEDOR).
export const MODULES = [
  { id: "dashboard", label: "Dashboard" },
  { id: "pedidos", label: "Pedidos" },
  { id: "vendas", label: "Vendas" },
  { id: "aprazo", label: "Vendas a prazo" },
  { id: "trocas", label: "Trocas & Devoluções" },
  { id: "boletos", label: "Boletos" },
  { id: "reservas", label: "Reservas" },
  { id: "mala", label: "Mala HUX" },
  { id: "encomendas", label: "Encomendas" },
  { id: "confeccao", label: "Confecção" },
  { id: "produtos", label: "Produtos" },
  { id: "estoque", label: "Estoque" },
  { id: "notafiscal", label: "Nota Fiscal IA" },
  { id: "promocoes", label: "Promoções" },
  { id: "cupons", label: "Cupons" },
  { id: "embaixadores", label: "Embaixadores" },
  { id: "clientes", label: "Clientes" },
  { id: "avisos", label: "Avise-me" },
  { id: "despesas", label: "Despesas" },
  { id: "notificacoes", label: "Notificações" },
  { id: "frete", label: "Frete" },
  { id: "auditoria", label: "Auditoria" },
] as const;
export type ModuleId = (typeof MODULES)[number]["id"];

// Config-only module, admin exclusive (not in the configurable matrix).
export const CONFIG_MODULE = { id: "config", label: "Configurações" } as const;

// Brazilian states.
export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
  "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
  "SP", "SE", "TO",
] as const;
export type UF = (typeof UFS)[number];

// Marketing copy per brand (used across the institutional site + store).
export const BRAND_INFO: Record<Brand, { tagline: string; blurb: string; accent: string }> = {
  HUX: {
    tagline: "Marca própria",
    blurb: "Performance de rua, feita em casa. A linha assinatura HUX, produzida internamente.",
    accent: "#C6FF00",
  },
  HAUSS: {
    tagline: "Estrada & trilha",
    blurb: "Peças técnicas para quem encara distância. Leveza e respiro em cada quilômetro.",
    accent: "#4A9FE8",
  },
  HOUND: {
    tagline: "Velocidade",
    blurb: "Corte agressivo e tecidos rápidos para treinos de intensidade e prova.",
    accent: "#E5484D",
  },
  SNUGG: {
    tagline: "Lifestyle",
    blurb: "O conforto do pós-treino que vai do alongamento ao café. Casual com DNA de corrida.",
    accent: "#B968E8",
  },
};

export function isRole(v: string): v is Role {
  return (ROLES as readonly string[]).includes(v);
}
export function isOrderStatus(v: string): v is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(v);
}
