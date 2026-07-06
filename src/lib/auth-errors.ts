/**
 * Traduz erros de autenticação do Supabase para mensagens em pt-BR.
 * Client-safe (sem imports de servidor). Nunca expor códigos crus ao usuário.
 */
type ComCodigo = { code?: string; message?: string } | null | undefined;

const MENSAGENS: Record<string, string> = {
  invalid_credentials: "E-mail ou senha incorretos.",
  email_not_confirmed: "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.",
  user_already_exists: "Já existe uma conta com este e-mail.",
  email_exists: "Já existe uma conta com este e-mail.",
  weak_password: "Senha muito fraca. Use ao menos 8 caracteres.",
  same_password: "A nova senha deve ser diferente da atual.",
  over_email_send_rate_limit: "Muitas tentativas. Aguarde alguns minutos e tente de novo.",
  over_request_rate_limit: "Muitas tentativas. Aguarde um pouco e tente novamente.",
  validation_failed: "Confira os dados informados.",
};

export function mensagemErroAuth(error: ComCodigo): string {
  const code = error?.code;
  if (code && MENSAGENS[code]) return MENSAGENS[code];
  return "Algo deu errado. Tente novamente em instantes.";
}
