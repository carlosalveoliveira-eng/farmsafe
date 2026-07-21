begin;

-- =========================================================
-- 001 - Hardening FarmSafe
-- Objetivo:
-- - Usuário inativo não acessa dados
-- - anon não acessa tabelas diretamente
-- - coletor continua funcionando somente por RPC
-- - app_versions continua público para atualização do app
-- =========================================================


-- 1. Função segura para descobrir empresa do usuário logado
create or replace function farmsafe.get_empresa_id()
returns uuid
language sql
stable
security definer
set search_path = farmsafe, public
as $$
  select u.empresa_id
  from farmsafe.usuarios u
  where u.auth_user_id = auth.uid()
    and u.ativo is true
  limit 1;
$$;


-- 2. Função segura para descobrir role do usuário logado
create or replace function farmsafe.get_usuario_role()
returns text
language sql
stable
security definer
set search_path = farmsafe, public
as $$
  select u.role
  from farmsafe.usuarios u
  where u.auth_user_id = auth.uid()
    and u.ativo is true
  limit 1;
$$;


-- 3. Função auxiliar para validar roles
create or replace function farmsafe.usuario_tem_role(p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = farmsafe, public
as $$
  select coalesce(farmsafe.get_usuario_role() = any(p_roles), false);
$$;


-- 4. Usuários: somente usuário ativo vê o próprio perfil.
-- Dono/admin/gerente podem ver usuários da mesma empresa.
drop policy if exists usuarios_select on farmsafe.usuarios;

create policy usuarios_select
on farmsafe.usuarios
for select
to authenticated
using (
  ativo is true
  and (
    auth_user_id = auth.uid()
    or (
      empresa_id = farmsafe.get_empresa_id()
      and farmsafe.usuario_tem_role(array['dono', 'admin_empresa', 'gerente'])
    )
  )
);


-- 5. Remover acesso direto anon da tabela de dispositivos.
-- O coletor deve usar RPC, não SELECT direto na tabela.
drop policy if exists coletor_validar_dispositivo on farmsafe.dispositivos;


-- 6. Remover permissões diretas do anon nas tabelas do schema.
-- O anon continuará usando somente RPCs liberadas.
revoke all privileges on all tables in schema farmsafe from anon;


-- 7. Permitir leitura pública somente da tabela de versões publicadas do app.
grant select on farmsafe.app_versions to anon;
grant select on farmsafe.app_versions to authenticated;


-- 8. Garantir uso do schema pelas roles.
grant usage on schema farmsafe to anon;
grant usage on schema farmsafe to authenticated;


-- 9. Reforçar permissões das RPCs do coletor.
-- Essas podem ser anon porque validam device_secret internamente.
grant execute on function farmsafe.ativar_dispositivo(text) to anon, authenticated;

grant execute on function farmsafe.coletor_obter_carga(text) to anon, authenticated;

grant execute on function farmsafe.coletor_verificar_atualizacao(
  text,
  text,
  text,
  integer
) to anon, authenticated;

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
) to anon, authenticated;

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
) to anon, authenticated;


-- 10. RPCs do painel web: somente authenticated.
revoke execute on function farmsafe.listar_saldos_insumos() from anon;

grant execute on function farmsafe.listar_saldos_insumos() to authenticated;

revoke execute on function farmsafe.processar_documento_fiscal_estoque(
  uuid,
  uuid,
  uuid
) from anon;

grant execute on function farmsafe.processar_documento_fiscal_estoque(
  uuid,
  uuid,
  uuid
) to authenticated;


-- 11. Helper interno não precisa ficar exposto diretamente.
revoke execute on function farmsafe._resolve_device(text) from public;
revoke execute on function farmsafe._resolve_device(text) from anon;
revoke execute on function farmsafe._resolve_device(text) from authenticated;


-- 12. Remover DELETE da role authenticated.
-- Exclusões devem ser controladas por SQL administrativo/RPC no futuro.
revoke delete on all tables in schema farmsafe from authenticated;


-- 13. Índices úteis para segurança/performance das policies.
create index if not exists idx_usuarios_auth_user_id
on farmsafe.usuarios(auth_user_id);

create index if not exists idx_usuarios_empresa_id
on farmsafe.usuarios(empresa_id);

create index if not exists idx_usuarios_empresa_ativo
on farmsafe.usuarios(empresa_id, ativo);


-- 14. Tornar empresa_id obrigatório onde já não existem nulos.
do $$
begin
  if not exists (select 1 from farmsafe.abastecimentos where empresa_id is null) then
    alter table farmsafe.abastecimentos alter column empresa_id set not null;
  end if;

  if not exists (select 1 from farmsafe.cochos where empresa_id is null) then
    alter table farmsafe.cochos alter column empresa_id set not null;
  end if;

  if not exists (select 1 from farmsafe.dispositivos where empresa_id is null) then
    alter table farmsafe.dispositivos alter column empresa_id set not null;
  end if;

  if not exists (select 1 from farmsafe.lotes where empresa_id is null) then
    alter table farmsafe.lotes alter column empresa_id set not null;
  end if;

  if not exists (select 1 from farmsafe.retiros where empresa_id is null) then
    alter table farmsafe.retiros alter column empresa_id set not null;
  end if;

  if not exists (select 1 from farmsafe.insumos where empresa_id is null) then
    alter table farmsafe.insumos alter column empresa_id set not null;
  end if;

  if not exists (select 1 from farmsafe.estoque_movimentacoes where empresa_id is null) then
    alter table farmsafe.estoque_movimentacoes alter column empresa_id set not null;
  end if;

  if not exists (select 1 from farmsafe.maps where empresa_id is null) then
    alter table farmsafe.maps alter column empresa_id set not null;
  end if;

  if not exists (select 1 from farmsafe.map_areas where empresa_id is null) then
    alter table farmsafe.map_areas alter column empresa_id set not null;
  end if;
end $$;


commit;