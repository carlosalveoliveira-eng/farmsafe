-- FarmSafe Phase 0 multi-tenancy contract checks.
--
-- Metadata-only: does not create, update or delete customer data.
--
-- npx supabase db query --linked --project-ref <project-ref> --file supabase/tests/phase0_multitenancy_contract.sql

with tenant_tables(table_name) as (
  values
    ('abastecimentos'),
    ('cochos'),
    ('dispositivos'),
    ('documentos_fiscais'),
    ('documentos_fiscais_itens'),
    ('documentos_fiscais_pagamentos'),
    ('empresa_documentos_fiscais'),
    ('estoque_movimentacoes'),
    ('fazendas'),
    ('insumos'),
    ('logs_operacionais'),
    ('lote_map_movimentacoes'),
    ('lotes'),
    ('map_areas'),
    ('maps'),
    ('retiros'),
    ('usuarios')
),
table_contract as (
  select
    t.table_name,
    c.oid as table_oid,
    c.relrowsecurity as rls_enabled,
    exists (
      select 1
      from information_schema.columns col
      where col.table_schema = 'farmsafe'
        and col.table_name = t.table_name
        and col.column_name = 'empresa_id'
    ) as has_empresa_id,
    exists (
      select 1
      from pg_policy pol
      where pol.polrelid = c.oid
        and (
          pg_get_expr(pol.polqual, pol.polrelid) like '%get_empresa_id%'
          or pg_get_expr(pol.polwithcheck, pol.polrelid) like '%get_empresa_id%'
          or pg_get_expr(pol.polqual, pol.polrelid) like '%empresa_id%'
          or pg_get_expr(pol.polwithcheck, pol.polrelid) like '%empresa_id%'
        )
    ) as has_tenant_policy
  from tenant_tables t
  left join pg_class c on c.relname = t.table_name
  left join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'farmsafe'
),
checks as (
  select
    'tenant_tables_exist' as check_name,
    count(*) = (select count(*) from tenant_tables) as passed,
    string_agg(t.table_name, ', ' order by t.table_name)
      filter (where tc.table_name is null) as details
  from tenant_tables t
  left join table_contract tc on tc.table_name = t.table_name

  union all

  select
    'tenant_tables_have_empresa_id',
    bool_and(has_empresa_id),
    string_agg(table_name, ', ' order by table_name)
      filter (where not has_empresa_id)
  from table_contract

  union all

  select
    'tenant_tables_have_rls',
    bool_and(rls_enabled),
    string_agg(table_name, ', ' order by table_name)
      filter (where not rls_enabled)
  from table_contract

  union all

  select
    'tenant_tables_have_tenant_policy',
    bool_and(has_tenant_policy),
    string_agg(table_name, ', ' order by table_name)
      filter (where not has_tenant_policy)
  from table_contract

  union all

  select
    'admin_rpcs_authenticated_only',
    not exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'farmsafe'
        and p.proname in (
          'admin_atualizar_usuario',
          'admin_listar_usuarios',
          'admin_reativar_dispositivo',
          'admin_revogar_dispositivo'
        )
        and (
          has_function_privilege('public', p.oid, 'execute')
          or has_function_privilege('anon', p.oid, 'execute')
          or not has_function_privilege('authenticated', p.oid, 'execute')
        )
    ),
    null::text

  union all

  select
    'collector_rpcs_anon_allowed_with_search_path',
    not exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'farmsafe'
        and p.proname in (
          'coletor_obter_carga',
          'coletor_verificar_atualizacao',
          'registrar_abastecimento_coletor'
        )
        and (
          not has_function_privilege('anon', p.oid, 'execute')
          or not (
            coalesce(array_to_string(p.proconfig, ','), '')
              like '%search_path=farmsafe, public%'
          )
        )
    ),
    null::text
)
select
  check_name,
  case when passed then 'PASS' else 'FAIL' end as status,
  coalesce(details, '') as details
from checks
order by check_name;
