import { z } from "zod";

/** Schemas de autenticação — isomórficos (RHF no client + validação no server). */

const email = z.string().trim().min(1, "Informe seu e-mail.").email("E-mail inválido.");

const senhaForte = z.string().min(8, "A senha deve ter ao menos 8 caracteres.");

export const loginSchema = z.object({
  email,
  senha: z.string().min(1, "Informe sua senha."),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const cadastroSchema = z.object({
  fullName: z.string().trim().min(2, "Informe seu nome completo."),
  email,
  senha: senhaForte,
  aceiteLgpd: z
    .boolean()
    .refine((v) => v === true, "É necessário aceitar os termos para continuar."),
});
export type CadastroInput = z.infer<typeof cadastroSchema>;

export const recuperarSenhaSchema = z.object({ email });
export type RecuperarSenhaInput = z.infer<typeof recuperarSenhaSchema>;

export const redefinirSenhaSchema = z
  .object({
    senha: senhaForte,
    confirmarSenha: z.string().min(1, "Confirme a senha."),
  })
  .refine((d) => d.senha === d.confirmarSenha, {
    message: "As senhas não coincidem.",
    path: ["confirmarSenha"],
  });
export type RedefinirSenhaInput = z.infer<typeof redefinirSenhaSchema>;
