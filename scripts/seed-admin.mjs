// Cria a conta de admin (super_admin) para acessar /admin.
// Uso: node --env-file=.env.local scripts/seed-admin.mjs
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !SERVICE)
  throw new Error("Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");

const EMAIL = process.env.ADMIN_EMAIL ?? "admin@fisio-pilates.local";
const PASSWORD = process.env.ADMIN_PASSWORD ?? "admin12345";
const NOME = process.env.ADMIN_NOME ?? "Admin FisioPilates";
const ROLE = process.env.ADMIN_ROLE ?? "super_admin";

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
if (!user) {
  const { data, error } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: NOME },
  });
  if (error) throw error;
  user = data.user;
} else {
  await admin.auth.admin.updateUserById(user.id, {
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: NOME },
  });
}

// Garante profile (não é cliente; pode não ter profile).
await admin
  .from("profiles")
  .upsert({ id: user.id, full_name: NOME, email: EMAIL }, { onConflict: "id" });

// Promove para admin_users com o role pedido.
const { error: eAdmin } = await admin
  .from("admin_users")
  .upsert({ id: user.id, role: ROLE }, { onConflict: "id" });
if (eAdmin) throw eAdmin;
