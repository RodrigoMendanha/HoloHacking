-- Rodada 08, onda 4 — PACIENTE ARQUIVADO: o servidor recusa escrita clinica.
--
-- Arquivado (patients.status = 'inativo') pode ser lido, exportado e
-- reativado. Nao recebe: consulta nova ou editada, HOLOSCAN (nem
-- interpretacao), coleta de exames, resultado de exame, aplicacao de
-- ferramenta, documento. O front ja barra; isto e a mesma regra no banco,
-- valendo para qualquer cliente.
--
-- Como: um trigger BEFORE INSERT OR UPDATE nas tabelas clinicas. As RPCs
-- salvar_holoscan_completo, salvar_holoscope_completo e salvar_coleta_exames
-- gravam nessas tabelas, entao RAISE tambem por elas — sem redefinir as
-- RPCs. A escrita direta (tool_applications, documents, consultations, a
-- coleta sem data em lab_collections/lab_results) cai no mesmo trigger.
--
-- Nao muda: RLS, policies, grants, colunas, RPCs. DELETE nao e barrado (a
-- exclusao do paciente e dos registros dele segue as regras dela). Reativar
-- (UPDATE em patients) nao passa por aqui.
--
-- A funcao e SECURITY DEFINER so para LER o status do paciente; o search_path
-- e vazio e todo nome e qualificado. Ninguem a executa direto (revoke).

create or replace function public.bloquear_escrita_paciente_arquivado()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pid uuid;
  v_status text;
begin
  if tg_table_name = 'lab_results' then
    select c.patient_id into v_pid from public.lab_collections c where c.id = new.collection_id;
  else
    v_pid := new.patient_id;
  end if;
  if v_pid is null then
    return new;
  end if;
  select p.status into v_status from public.patients p where p.id = v_pid;
  if v_status = 'inativo' then
    raise exception 'paciente arquivado: reative antes de registrar novas informacoes'
      using errcode = 'P0001', hint = 'paciente_arquivado';
  end if;
  return new;
end;
$$;

revoke all on function public.bloquear_escrita_paciente_arquivado() from public, anon, authenticated;

drop trigger if exists consultations_paciente_arquivado on public.consultations;
create trigger consultations_paciente_arquivado
  before insert or update on public.consultations
  for each row execute function public.bloquear_escrita_paciente_arquivado();

drop trigger if exists holoscan_applications_paciente_arquivado on public.holoscan_applications;
create trigger holoscan_applications_paciente_arquivado
  before insert or update on public.holoscan_applications
  for each row execute function public.bloquear_escrita_paciente_arquivado();

drop trigger if exists lab_collections_paciente_arquivado on public.lab_collections;
create trigger lab_collections_paciente_arquivado
  before insert or update on public.lab_collections
  for each row execute function public.bloquear_escrita_paciente_arquivado();

drop trigger if exists lab_results_paciente_arquivado on public.lab_results;
create trigger lab_results_paciente_arquivado
  before insert or update on public.lab_results
  for each row execute function public.bloquear_escrita_paciente_arquivado();

drop trigger if exists tool_applications_paciente_arquivado on public.tool_applications;
create trigger tool_applications_paciente_arquivado
  before insert or update on public.tool_applications
  for each row execute function public.bloquear_escrita_paciente_arquivado();

drop trigger if exists documents_paciente_arquivado on public.documents;
create trigger documents_paciente_arquivado
  before insert or update on public.documents
  for each row execute function public.bloquear_escrita_paciente_arquivado();
