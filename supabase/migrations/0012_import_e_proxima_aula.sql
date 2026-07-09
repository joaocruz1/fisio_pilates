-- 0012_import_e_proxima_aula — import de aulas (multi-formato) + IA gera próxima aula
-- Ver plano ATUAL. Adiciona a categoria 'lesson' aos documentos, o tipo de
-- relatório 'next_session' e amplia os mime types do bucket de documentos.

-- documents.kind += 'lesson' (aula / registro de histórico)
alter table public.documents drop constraint if exists documents_kind_check;
alter table public.documents add constraint documents_kind_check
  check (kind in ('exam', 'postural_photo', 'medical_report', 'consent_form', 'lesson', 'other'));

-- ai_reports.report_type += 'next_session' (plano da próxima aula)
alter table public.ai_reports drop constraint if exists ai_reports_report_type_check;
alter table public.ai_reports add constraint ai_reports_report_type_check
  check (report_type in ('pilates_evolution', 'postural_evolution', 'full_evolution', 'next_session'));

-- Bucket student-documents: aceitar docx e texto (além de pdf/imagens).
update storage.buckets
set allowed_mime_types = array[
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
]
where id = 'student-documents';
