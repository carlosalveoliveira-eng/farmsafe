-- FarmSafe Phase 0 security/readiness checks.
--
-- These checks are metadata-only and do not create, update or delete customer
-- data. Run against a linked project after applying migrations:
--
-- npx supabase db query --linked --project-ref <project-ref> --file supabase/tests/phase0_security_checks.sql

with expected_checks as (
  select 'all_farmsafe_tables_have_rls' as check_name, not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'farmsafe'
      and c.relkind = 'r'
      and c.relrowsecurity is not true
  ) as passed

  union all

  select 'vw_status_cochos_is_security_invoker', exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'farmsafe'
      and c.relname = 'vw_status_cochos'
      and c.relkind = 'v'
      and coalesce(c.reloptions, array[]::text[]) @> array['security_invoker=on']
  )

  union all

  select 'collector_rpc_contract_exists', exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'farmsafe'
      and p.proname = 'registrar_abastecimento_coletor'
      and pg_get_function_identity_arguments(p.oid) =
        'p_device_secret text, p_client_uuid text, p_codigo_qr text, p_insumo_id uuid, p_quantidade_kg numeric, p_observacao text, p_status_cocho text, p_leitura_cocho numeric, p_latitude numeric, p_longitude numeric, p_gps_accuracy numeric, p_registrado_em timestamp with time zone'
  )

  union all

  select 'collector_idempotency_index_exists', exists (
    select 1
    from pg_indexes
    where schemaname = 'farmsafe'
      and tablename = 'abastecimentos'
      and indexname = 'abastecimentos_empresa_client_uuid_uniq'
  )

  union all

  select 'admin_rpcs_not_granted_to_anon', not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'farmsafe'
      and p.proname in (
        'admin_listar_usuarios',
        'admin_atualizar_usuario',
        'admin_revogar_dispositivo',
        'admin_reativar_dispositivo'
      )
      and has_function_privilege('anon', p.oid, 'execute')
  )

  union all

  select 'internal_log_rpc_not_publicly_callable', not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'farmsafe'
      and p.proname = 'criar_log_operacional'
      and (
        has_function_privilege('public', p.oid, 'execute')
        or has_function_privilege('anon', p.oid, 'execute')
        or has_function_privilege('authenticated', p.oid, 'execute')
      )
  )
)
select
  check_name,
  case when passed then 'PASS' else 'FAIL' end as status
from expected_checks
order by check_name;
