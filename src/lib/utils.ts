import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind-aware className combiner. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Safe JSON parse for our String-backed JSON columns. */
export function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Mantém apenas URLs de imagem que o next/image aceita: caminhos locais ("/..")
 * ou http(s). Fotos importadas com caminhos inválidos (ex.: "file:///C:/...")
 * são descartadas — senão o next/image lança erro e derruba a página inteira.
 */
export function cleanImageUrl(src: string | null | undefined): string | null {
  if (!src) return null;
  const s = src.trim();
  if (s.startsWith("/")) return s;
  if (/^https?:\/\//i.test(s)) return s;
  return null;
}

/** Filtra uma lista de URLs de imagem, removendo as inválidas. */
export function cleanImages(arr: (string | null | undefined)[] | null | undefined): string[] {
  if (!arr) return [];
  return arr.map(cleanImageUrl).filter((s): s is string => !!s);
}

/** URL/handle-safe slug from arbitrary text. */
export function slugify(text: string): string {
  return text
    .toString()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// The app runs on UTC servers (Netlify/Neon). HUX opera no horário de Brasília,
// então formatamos sempre em America/Sao_Paulo para não mostrar hora/data em UTC.
export const TZ = "America/Sao_Paulo";

const DATE_FMT = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: TZ,
});
const DATETIME_FMT = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TZ,
});

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return DATE_FMT.format(new Date(d));
}
export function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return DATETIME_FMT.format(new Date(d));
}

/**
 * Parse a date-only input ("YYYY-MM-DD" from <input type=date>) as NOON in
 * Brasília, so timezone shifts never move it to the previous/next day (fixes
 * "vencimento aparece 1 dia antes"). Returns null for empty/invalid input.
 */
export function parseDateInput(v: string | null | undefined): Date | null {
  if (!v) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v.trim());
  if (m) {
    const dt = new Date(`${v}T12:00:00-03:00`);
    return isNaN(dt.getTime()) ? null : dt;
  }
  const dt = new Date(v);
  return isNaN(dt.getTime()) ? null : dt;
}

/** Format a Date as "YYYY-MM-DD" in Brasília (for prefilling date inputs). */
export function toDateInput(d: Date | string | null | undefined): string {
  if (!d) return "";
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(d));
  return parts; // en-CA gives YYYY-MM-DD
}

/** "2026-07" month key. */
export function monthKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function maskCep(cep: string): string {
  const digits = cep.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function onlyDigits(v: string): string {
  return (v || "").replace(/\D/g, "");
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}
