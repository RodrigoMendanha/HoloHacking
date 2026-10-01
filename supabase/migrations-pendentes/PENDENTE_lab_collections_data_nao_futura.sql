-- PENDENTE DE DECISAO DE PRODUTO/CLINICA — NAO APLICAR.
--
-- Etapa 0 da V1 (reconciliacao com o Documento Mestre). Esta regra nasceu
-- na Rodada 08 dentro da migration 20260930140000 ("data da coleta nao pode
-- ser futura", tolerancia de 1 dia sobre o UTC). O Documento Mestre nao a
-- define como contrato obrigatorio da V1 (secao 22 registra a data clinica
-- da coleta; secao 37 diz que o documento nao inventa regras). Por isso ela
-- foi SEPARADA da correcao tecnica das coletas e fica aqui, fora de
-- supabase/migrations/, ate alguem decidir se e regra da V1.
--
-- Se for aprovada: mover para supabase/migrations/ com data nova, aplicar
-- depois da 20260930140000 e reativar a validacao de data no front
-- (arquivos.js, problemaDataColeta) e no falso de teste (supabase-falso.mjs).
-- Se for recusada: apagar este arquivo.

create or replace function public.lab_collections_data_nao_futura()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.coletado_em is not null
     and new.coletado_em > (now() at time zone 'utc')::date + 1 then
    raise exception 'data da coleta no futuro: %', new.coletado_em using errcode = '22008';
  end if;
  return new;
end;
$$;

revoke all on function public.lab_collections_data_nao_futura() from public, anon, authenticated;

drop trigger if exists lab_collections_data_nao_futura on public.lab_collections;
create trigger lab_collections_data_nao_futura
  before insert or update of coletado_em on public.lab_collections
  for each row execute function public.lab_collections_data_nao_futura();
