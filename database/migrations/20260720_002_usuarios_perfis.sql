begin;

-- =========================================================
-- 002 - Gestão de usuários e perfis
-- =========================================================

-- 1. Campos extras seguros para o cadastro administrativo
alter table farmsafe.usuarios
add column if not exists email text,
add column if not exists cargo text,
add column if not exists telefone text,
add column if not exists updated_at timestamptz,
add column if not exists created_by uuid;

update farmsafe.usuarios
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;


-- 2. Constraint de perfis permitidos
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'usuarios_role_check'
      and conrelid = 'farmsafe.usuarios'::regclass
  ) then
    alter table farmsafe.usuarios
    add constraint usuarios_role_check
    check (
      role in (
        'dono',
        'admin_empresa',
        'gerente',
        'controller',
        'escritorio'
      )
    );
  end if;
end $$;


-- 3. Trigger updated_at
drop trigger if exists trg_usuarios_updated_at on farmsafe.usuarios;

create trigger trg_usuarios_updated_at
before update on farmsafe.usuarios
for each row
execute function farmsafe.set_updated_at();


-- 4. Remover escrita direta via frontend.
-- Atualização de usuários será feita por RPC controlada.
revoke insert, update, delete on farmsafe.usuarios from authenticated;
revoke insert, update, delete on farmsafe.usuarios from anon;


-- 5. Função para listar usuários da própria empresa
create or replace function farmsafe.admin_listar_usuarios()
returns table (
  id uuid,
  auth_user_id uuid,
  empresa_id uuid,
  nome text,
  email text,
  cargo text,
  telefone text,
  role text,
  ativo boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = farmsafe, public
as $$
declare
  v_empresa_id uuid;
  v_role text;
begin
  v_empresa_id := farmsafe.get_empresa_id();
  v_role := farmsafe.get_usuario_role();

  if v_empresa_id is null then
    raise exception 'Usuário sem empresa ativa.';
  end if;

  if v_role not in ('dono', 'admin_empresa', 'gerente') then
    raise exception 'Você não tem permissão para gerenciar usuários.';
  end if;

  return query
  select
    u.id,
    u.auth_user_id,
    u.empresa_id,
    u.nome,
    u.email,
    u.cargo,
    u.telefone,
    u.role,
    u.ativo,
    u.created_at,
    u.updated_at
  from farmsafe.usuarios u
  where u.empresa_id = v_empresa_id
  order by
    case u.role
      when 'dono' then 1
      when 'admin_empresa' then 2
      when 'gerente' then 3
      when 'controller' then 4
      when 'escritorio' then 5
      else 9
    end,
    u.nome;
end;
$$;


-- 6. Função para atualizar usuário com validações de produção
create or replace function farmsafe.admin_atualizar_usuario(
  p_usuario_id uuid,
  p_nome text,
  p_email text,
  p_cargo text,
  p_telefone text,
  p_role text,
  p_ativo boolean
)
returns jsonb
language plpgsql
security definer
set search_path = farmsafe, public
as $$
declare
  v_empresa_id uuid;
  v_role_logado text;
  v_usuario farmsafe.usuarios%rowtype;
  v_donos_ativos integer;
begin
  v_empresa_id := farmsafe.get_empresa_id();
  v_role_logado := farmsafe.get_usuario_role();

  if v_empresa_id is null then
    return jsonb_build_object(
      'ok', false,
      'erro', 'Usuário sem empresa ativa.'
    );
  end if;

  if v_role_logado not in ('dono', 'admin_empresa', 'gerente') then
    return jsonb_build_object(
      'ok', false,
      'erro', 'Você não tem permissão para gerenciar usuários.'
    );
  end if;

  if p_role not in ('dono', 'admin_empresa', 'gerente', 'controller', 'escritorio') then
    return jsonb_build_object(
      'ok', false,
      'erro', 'Perfil inválido.'
    );
  end if;

  select *
  into v_usuario
  from farmsafe.usuarios
  where id = p_usuario_id
    and empresa_id = v_empresa_id
  limit 1;

  if v_usuario.id is null then
    return jsonb_build_object(
      'ok', false,
      'erro', 'Usuário não encontrado nesta empresa.'
    );
  end if;

  -- Somente dono pode criar/manter outro dono
  if p_role = 'dono' and v_role_logado <> 'dono' then
    return jsonb_build_object(
      'ok', false,
      'erro', 'Somente o dono pode definir outro usuário como dono.'
    );
  end if;

  -- Somente dono pode alterar um usuário dono
  if v_usuario.role = 'dono' and v_role_logado <> 'dono' then
    return jsonb_build_object(
      'ok', false,
      'erro', 'Somente o dono pode alterar outro dono.'
    );
  end if;

  -- Impede inativar ou rebaixar o último dono ativo
  if v_usuario.role = 'dono'
     and (p_role <> 'dono' or p_ativo is false) then

    select count(*)
    into v_donos_ativos
    from farmsafe.usuarios
    where empresa_id = v_empresa_id
      and role = 'dono'
      and ativo is true;

    if v_donos_ativos <= 1 then
      return jsonb_build_object(
        'ok', false,
        'erro', 'Não é permitido inativar ou alterar o último dono ativo da empresa.'
      );
    end if;
  end if;

  update farmsafe.usuarios
  set
    nome = nullif(trim(p_nome), ''),
    email = nullif(lower(trim(coalesce(p_email, ''))), ''),
    cargo = nullif(trim(coalesce(p_cargo, '')), ''),
    telefone = nullif(trim(coalesce(p_telefone, '')), ''),
    role = p_role,
    ativo = coalesce(p_ativo, false),
    updated_at = now()
  where id = p_usuario_id
    and empresa_id = v_empresa_id;

  return jsonb_build_object(
    'ok', true,
    'mensagem', 'Usuário atualizado com sucesso.'
  );
end;
$$;


grant execute on function farmsafe.admin_listar_usuarios() to authenticated;

grant execute on function farmsafe.admin_atualizar_usuario(
  uuid,
  text,
  text,
  text,
  text,
  text,
  boolean
) to authenticated;

commit;