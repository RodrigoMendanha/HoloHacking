-- Etapa 11: Revogar todos os privilégios do role anon nas tabelas públicas.
-- O app só usa o role authenticated; anon não precisa de acesso algum.
-- RLS já bloqueia (nenhuma policy target anon), mas revogar é defesa em profundidade.

REVOKE ALL ON TABLE public.patients            FROM anon;
REVOKE ALL ON TABLE public.profiles            FROM anon;
REVOKE ALL ON TABLE public.consultations       FROM anon;
REVOKE ALL ON TABLE public.schedule_blocks     FROM anon;
REVOKE ALL ON TABLE public.tool_applications   FROM anon;
REVOKE ALL ON TABLE public.documents           FROM anon;
REVOKE ALL ON TABLE public.professional_assets FROM anon;
REVOKE ALL ON TABLE public.holoscope_applications  FROM anon;
REVOKE ALL ON TABLE public.holoscope_answers       FROM anon;
REVOKE ALL ON TABLE public.holoscope_system_scores FROM anon;
REVOKE ALL ON TABLE public.lab_collections     FROM anon;
REVOKE ALL ON TABLE public.lab_results         FROM anon;

-- Revogar EXECUTE nas RPCs do anon (ambas verificam auth.uid() internamente,
-- mas não há razão para anon poder chamá-las).
REVOKE EXECUTE ON FUNCTION public.salvar_holoscope_completo(jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.salvar_coleta_exames(jsonb)     FROM anon;
