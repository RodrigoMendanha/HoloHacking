-- =====================================================================
-- ATENDIMENTO — PESO E ALTURA (14/10)
-- =====================================================================
-- Aditiva. Peso e altura sao medidos pela nutricionista NA consulta: ficam no atendimento (encounters),
-- assim cada consulta guarda a sua medida e a ficha mostra a mais recente. Sem calculo no banco.
-- Grants e RLS de encounters ja cobrem as colunas novas (select/insert/update da propria conta;
-- paciente arquivado continua bloqueado pelo trigger existente).
begin;

alter table public.encounters add column if not exists weight_kg numeric(5,2);
alter table public.encounters add column if not exists height_cm numeric(5,1);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'encounters_weight_kg_faixa') then
    alter table public.encounters add constraint encounters_weight_kg_faixa check (weight_kg is null or (weight_kg >= 1 and weight_kg <= 400));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'encounters_height_cm_faixa') then
    alter table public.encounters add constraint encounters_height_cm_faixa check (height_cm is null or (height_cm >= 30 and height_cm <= 250));
  end if;
end $$;
comment on column public.encounters.weight_kg is 'Peso medido pela nutricionista neste atendimento (kg).';
comment on column public.encounters.height_cm is 'Altura medida pela nutricionista neste atendimento (cm).';

commit;
