import { AjudaApp } from "@/components/ajuda/ajuda-app";
import { listStudents } from "@/server/students";

export const metadata = { title: "Ajuda" };

export default async function AjudaPage() {
  const alunos = await listStudents();
  return <AjudaApp primeiroAlunoId={alunos[0]?.id ?? null} />;
}
