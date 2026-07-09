-- 0016_sessao_agendamento — Liga a aula REGISTRADA (sessions) ao AGENDAMENTO
-- (appointments) que a originou. Ao registrar a aula pelo agendamento, a
-- sessão aponta para ele e o agendamento é marcado como realizado.
-- on delete set null: excluir o agendamento não apaga a aula registrada.

alter table public.sessions
  add column if not exists appointment_id uuid references public.appointments (id) on delete set null;

create index if not exists sessions_appointment_idx on public.sessions (appointment_id);
