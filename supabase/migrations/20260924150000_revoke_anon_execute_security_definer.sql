-- ============================================================================
-- REVOKE EXECUTE de funcoes SECURITY DEFINER para o papel anon
-- ============================================================================
--
-- O advisor de seguranca flagou 3 funcoes SECURITY DEFINER acessiveis por anon.
-- Revogamos de public (de onde anon herda) e concedemos apenas a authenticated.
-- ============================================================================

REVOKE EXECUTE ON FUNCTION public.salvar_holoscan_completo(jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.salvar_holoscan_completo(jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.salvar_holoscope_completo(jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.salvar_holoscope_completo(jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.salvar_coleta_exames(jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.salvar_coleta_exames(jsonb) TO authenticated;
