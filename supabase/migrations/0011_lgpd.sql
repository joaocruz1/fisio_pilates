-- 0011_lgpd — Fase 8
-- Exclusão definitiva de aluno (2ª fase da exclusão em duas fases). Ver
-- 07-lgpd-seguranca.md. A 1ª fase é o soft delete (students.deleted_at); esta
-- função faz o hard delete (cascade) e devolve os paths de Storage a purgar.
-- Invocada por um job/service_role (nunca diretamente pela usuária).

create or replace function private.erase_student(p_student_id uuid)
returns table (storage_path text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Coleta os objetos de Storage do aluno para o chamador purgar (a função SQL
  -- não apaga binários no Storage — isso é feito via API pelo job).
  return query
    select d.storage_path from public.documents d where d.student_id = p_student_id;

  -- Hard delete: as FKs on delete cascade removem avaliações, condições, sessões,
  -- exercícios de sessão, medidas, documentos, relatórios e chats vinculados.
  delete from public.students where id = p_student_id;
end;
$$;

revoke all on function private.erase_student(uuid) from public;
grant execute on function private.erase_student(uuid) to service_role;
