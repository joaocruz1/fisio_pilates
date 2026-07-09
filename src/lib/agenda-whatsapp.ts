import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { linkWhatsApp } from "@/lib/utils";

/**
 * Monta o link wa.me com uma mensagem de lembrete da aula, já preenchida.
 * Retorna null se não houver telefone válido. Não envia nada — apenas abre a
 * conversa no WhatsApp com o texto pronto (a profissional confirma o envio).
 */
export function lembreteWhatsApp(opts: {
  phone: string | null | undefined;
  nome: string;
  data: string; // YYYY-MM-DD
  hora: string; // HH:MM(:SS)
  studio: string | null | undefined;
}): string | null {
  const base = linkWhatsApp(opts.phone);
  if (!base) return null;

  const primeiro = opts.nome.trim().split(/\s+/)[0] || "";
  const dataExtenso = format(parseISO(opts.data), "EEEE, d 'de' MMMM", { locale: ptBR });
  const hora = opts.hora.slice(0, 5);
  const assinatura = opts.studio ? ` — ${opts.studio}` : "";

  const msg =
    `Oi, ${primeiro}! 😊 Passando para lembrar da sua aula de Pilates ` +
    `${dataExtenso} às ${hora}. Qualquer imprevisto, me avise. Até lá!${assinatura}`;

  return `${base}?text=${encodeURIComponent(msg)}`;
}
