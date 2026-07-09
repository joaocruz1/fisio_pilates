// Cria/atualiza a usuária de teste com onboarding concluído (cai direto no dashboard).
// Uso: node --env-file=.env.local scripts/seed-user.mjs
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !SERVICE)
  throw new Error("Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");

const EMAIL = "rhenata@gmail.com";
const PASSWORD = "rhesiqueira123";
const NOME = "Rhenata Siqueira";
const ESTUDIO = "Studio Rhenata";

const admin = createClient(URL, SERVICE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function findUser(email) {
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email === email);
    if (found) return found;
    if (data.users.length < 200) return null;
  }
}

let user = await findUser(EMAIL);
if (user) {
  await admin.auth.admin.updateUserById(user.id, {
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: NOME },
  });
} else {
  const { data, error } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: NOME },
  });
  if (error) throw error;
  user = data.user;
}

// Onboarding concluído + nomes preenchidos → login vai direto ao dashboard.
const { data: member } = await admin
  .from("tenant_members")
  .select("tenant_id")
  .eq("user_id", user.id)
  .maybeSingle();

await admin
  .from("profiles")
  .update({ full_name: NOME, onboarding_completed_at: new Date().toISOString() })
  .eq("id", user.id);

if (member?.tenant_id) {
  await admin
    .from("tenants")
    .update({ name: ESTUDIO, plan: "vitalicio" })
    .eq("id", member.tenant_id);
}
