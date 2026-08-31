begin;

-- FarmSafe Phase 0 - RPC hardening.
--
-- Data safety:
-- - no data is deleted;
-- - no table is dropped or recreated;
-- - public contracts used by the current collector are preserved;
-- - legacy collector RPCs are not removed, only narrowed and made explicit.

-- SECURITY DEFINER functions must not depend on the caller search_path.
alter function farmsafe.ativar_dispositivo(text)
  set search_path = farmsafe, public;

alter function farmsafe.sync_abastecimento(
  text,
  uuid,
  text,
  uuid,
  text,
  numeric,
  text,
  double precision,
  double precision,
  timestamp with time zone
)
  set search_path = farmsafe, public;

alter function farmsafe.criar_log_operacional(
  uuid,
  uuid,
  uuid,
  text,
  text,
  jsonb
)
  set search_path = farmsafe, public;

-- Remove inherited PUBLIC execution from privileged functions.
-- Explicit grants below keep the current app and collector contracts intact.
revoke execute on function farmsafe.ativar_dispositivo(text) from public;
revoke execute on function farmsafe.ativar_dispositivo(text) from anon;
revoke execute on function farmsafe.ativar_dispositivo(text) from authenticated;

-- The current collector activates through coletor_obter_carga(), but this
-- function is kept for compatibility with older builds. It still requires the
-- device secret internally.
grant execute on function farmsafe.ativar_dispositivo(text) to anon;

revoke execute on function farmsafe.coletor_obter_carga(text) from public;
revoke execute on function farmsafe.coletor_obter_carga(text) from anon;
revoke execute on function farmsafe.coletor_obter_carga(text) from authenticated;
grant execute on function farmsafe.coletor_obter_carga(text) to anon;

revoke execute on function farmsafe.coletor_verificar_atualizacao(
  text,
  text,
  text,
  integer
) from public;
revoke execute on function farmsafe.coletor_verificar_atualizacao(
  text,
  text,
  text,
  integer
) from anon;
revoke execute on function farmsafe.coletor_verificar_atualizacao(
  text,
  text,
  text,
  integer
) from authenticated;
grant execute on function farmsafe.coletor_verificar_atualizacao(
  text,
  text,
  text,
  integer
) to anon;

revoke execute on function farmsafe.registrar_abastecimento_coletor(
  text,
  text,
  text,
  uuid,
  numeric,
  text,
  text,
  numeric,
  numeric,
  numeric,
  numeric,
  timestamp with time zone
) from public;
revoke execute on function farmsafe.registrar_abastecimento_coletor(
  text,
  text,
  text,
  uuid,
  numeric,
  text,
  text,
  numeric,
  numeric,
  numeric,
  numeric,
  timestamp with time zone
) from anon;
revoke execute on function farmsafe.registrar_abastecimento_coletor(
  text,
  text,
  text,
  uuid,
  numeric,
  text,
  text,
  numeric,
  numeric,
  numeric,
  numeric,
  timestamp with time zone
) from authenticated;
grant execute on function farmsafe.registrar_abastecimento_coletor(
  text,
  text,
  text,
  uuid,
  numeric,
  text,
  text,
  numeric,
  numeric,
  numeric,
  numeric,
  timestamp with time zone
) to anon;

-- Legacy collector sync remains available only to anon for old installed APKs.
-- It should be removed in a future major collector migration after confirming
-- all devices have upgraded to registrar_abastecimento_coletor().
revoke execute on function farmsafe.sync_abastecimento(
  text,
  uuid,
  text,
  uuid,
  text,
  numeric,
  text,
  double precision,
  double precision,
  timestamp with time zone
) from public;
revoke execute on function farmsafe.sync_abastecimento(
  text,
  uuid,
  text,
  uuid,
  text,
  numeric,
  text,
  double precision,
  double precision,
  timestamp with time zone
) from anon;
revoke execute on function farmsafe.sync_abastecimento(
  text,
  uuid,
  text,
  uuid,
  text,
  numeric,
  text,
  double precision,
  double precision,
  timestamp with time zone
) from authenticated;
grant execute on function farmsafe.sync_abastecimento(
  text,
  uuid,
  text,
  uuid,
  text,
  numeric,
  text,
  double precision,
  double precision,
  timestamp with time zone
) to anon;

-- Legacy delta RPC is not called by the current collector, but may be used by
-- old builds. Keep anon access, remove inherited PUBLIC access.
revoke execute on function farmsafe.get_dados_sincronizacao(
  text,
  timestamp with time zone
) from public;
revoke execute on function farmsafe.get_dados_sincronizacao(
  text,
  timestamp with time zone
) from anon;
revoke execute on function farmsafe.get_dados_sincronizacao(
  text,
  timestamp with time zone
) from authenticated;
grant execute on function farmsafe.get_dados_sincronizacao(
  text,
  timestamp with time zone
) to anon;

-- Internal helper used by privileged database code. It should not be callable
-- directly through the Data API.
revoke execute on function farmsafe.criar_log_operacional(
  uuid,
  uuid,
  uuid,
  text,
  text,
  jsonb
) from public;
revoke execute on function farmsafe.criar_log_operacional(
  uuid,
  uuid,
  uuid,
  text,
  text,
  jsonb
) from anon;
revoke execute on function farmsafe.criar_log_operacional(
  uuid,
  uuid,
  uuid,
  text,
  text,
  jsonb
) from authenticated;

-- Administrative functions must stay authenticated-only.
revoke execute on function farmsafe.admin_listar_usuarios() from public;
revoke execute on function farmsafe.admin_listar_usuarios() from anon;
grant execute on function farmsafe.admin_listar_usuarios() to authenticated;

revoke execute on function farmsafe.admin_atualizar_usuario(
  uuid,
  text,
  text,
  text,
  text,
  text,
  boolean
) from public;
revoke execute on function farmsafe.admin_atualizar_usuario(
  uuid,
  text,
  text,
  text,
  text,
  text,
  boolean
) from anon;
grant execute on function farmsafe.admin_atualizar_usuario(
  uuid,
  text,
  text,
  text,
  text,
  text,
  boolean
) to authenticated;

revoke execute on function farmsafe.admin_revogar_dispositivo(uuid, text)
  from public;
revoke execute on function farmsafe.admin_revogar_dispositivo(uuid, text)
  from anon;
grant execute on function farmsafe.admin_revogar_dispositivo(uuid, text)
  to authenticated;

revoke execute on function farmsafe.admin_reativar_dispositivo(uuid)
  from public;
revoke execute on function farmsafe.admin_reativar_dispositivo(uuid)
  from anon;
grant execute on function farmsafe.admin_reativar_dispositivo(uuid)
  to authenticated;

commit;
