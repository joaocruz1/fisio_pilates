/** Retorno padronizado de Server Actions, consumido no client por useActionState/RHF. */
export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; erro: string };
