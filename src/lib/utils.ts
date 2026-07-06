import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Idade em anos a partir de uma data ISO (yyyy-mm-dd). null se ausente/inválida. */
export function idadeAnos(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;
  const nasc = new Date(birthDate);
  if (Number.isNaN(nasc.getTime())) return null;
  const hoje = new Date();
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
  return idade >= 0 && idade < 130 ? idade : null;
}

/** Formata uma data ISO (yyyy-mm-dd) para dd/mm/aaaa. "" se ausente. */
export function formatarData(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR");
}

/** Só os dígitos de uma string (telefone/CPF). */
export function apenasDigitos(v: string | null | undefined): string {
  return (v ?? "").replace(/\D/g, "");
}

/** Link wa.me a partir de um telefone brasileiro. null se telefone vazio. */
export function linkWhatsApp(phone: string | null | undefined): string | null {
  const d = apenasDigitos(phone);
  if (d.length < 10) return null;
  const comDDI = d.startsWith("55") ? d : `55${d}`;
  return `https://wa.me/${comDDI}`;
}

/** Slug seguro para nomes de arquivo (sem acentos, minúsculo, hifenizado). */
export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Formata bytes para uma string legível (KB/MB). */
export function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
