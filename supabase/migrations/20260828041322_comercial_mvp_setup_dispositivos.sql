begin;

-- Commercial MVP foundation.
-- Safe with existing test data: all changes are additive or status updates.

alter table farmsafe.dispositivos
add column if not exists revogado_em timestamp with time zone,
add column if not exists revogado_por uuid,
add column if not exists revogacao_motivo text;

create index if not exists idx_dispositivos_empresa_ativo_sync
on farmsafe.dispositivos (empresa_id, ativo, ultimo_sync desc);

create index if not exists idx_abastecimentos_empresa_registrado
on farmsafe.abastecimentos (empresa_id, registrado_em desc);

create index if not exists idx_abastecimentos_empresa_cocho_registrado
on farmsafe.abastecimentos (empresa_id, cocho_id, registrado_em desc);

create or replace function farmsafe.criar_setup_empresa_inicial(
  p_empresa_nome text,
  p_usuario_nome text,
  p_fazenda_nome text default null::text,
  p_fazenda_cidade text default null::text,
  p_fazenda_estado text default null::text
)
returns jsonb
language plpgsql
security definer
set search_path = farmsafe, public
as $$
declare
  v_auth_user_id uuid;
  v_email text;
  v_empresa_id uuid;
  v_usuario_id uuid;
  v_fazenda_id uuid;
  v_fazenda_codigo text;
begin
  v_auth_user_id := auth.uid();

  if v_auth_user_id is null then
    return jsonb_build_object(
      'ok', false,
      'codigo', 'NAO_AUTENTICADO',
      'erro', 'Sessao invalida ou expirada.'
    );
  end if;

  if nullif(trim(coalesce(p_empresa_nome, '')), '') is null then
    return jsonb_build_object(
      'ok', false,
      'codigo', 'EMPRESA_OBRIGATORIA',
      'erro', 'Informe o nome da empresa.'
    );
  end if;

  if nullif(trim(coalesce(p_usuario_nome, '')), '') is null then
    return jsonb_build_object(
      'ok', false,
      'codigo', 'USUARIO_OBRIGATORIO',
      'erro', 'Informe o nome do responsavel.'
    );
  end if;

  if exists (
    select 1
    from farmsafe.usuarios u
    where u.auth_user_id = v_auth_user_id
      and u.ativo is true
  ) then
    return jsonb_build_object(
      'ok', false,
      'codigo', 'USUARIO_JA_CONFIGURADO',
      'erro', 'Este usuario ja possui acesso ativo.'
    );
  end if;

  select au.email
  into v_email
  from auth.users au
  where au.id = v_auth_user_id
  limit 1;

  insert into farmsafe.empresas (nome, plano, max_fazendas, max_dispositivos, ativo)
  values (
    trim(p_empresa_nome),
    'starter',
    1,
    3,
    true
  )
  returning id into v_empresa_id;

  insert into farmsafe.usuarios (
    auth_user_id,
    empresa_id,
    nome,
    email,
    role,
    ativo,
    created_by,
    updated_at
  )
  values (
    v_auth_user_id,
    v_empresa_id,
    trim(p_usuario_nome),
    nullif(lower(trim(coalesce(v_email, ''))), ''),
    'dono',
    true,
    v_auth_user_id,
    now()
  )
  returning id into v_usuario_id;

  if nullif(trim(coalesce(p_fazenda_nome, '')), '') is not null then
    v_fazenda_codigo := 'FAZ-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

    insert into farmsafe.fazendas (
      empresa_id,
      nome,
      codigo,
      codigo_publico,
      cidade,
      estado,
      ativo
    )
    values (
      v_empresa_id,
      trim(p_fazenda_nome),
      v_fazenda_codigo,
      v_fazenda_codigo,
      nullif(trim(coalesce(p_fazenda_cidade, '')), ''),
      nullif(upper(trim(coalesce(p_fazenda_estado, ''))), ''),
      true
    )
    returning id into v_fazenda_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'empresa_id', v_empresa_id,
    'usuario_id', v_usuario_id,
    'fazenda_id', v_fazenda_id,
    'mensagem', 'Setup inicial concluido.'
  );
end;
$$;

create or replace function farmsafe.admin_revogar_dispositivo(
  p_dispositivo_id uuid,
  p_motivo text default null::text
)
returns jsonb
language plpgsql
security definer
set search_path = farmsafe, public
as $$
declare
  v_empresa_id uuid;
  v_role text;
  v_dispositivo record;
begin
  v_empresa_id := farmsafe.get_empresa_id();
  v_role := farmsafe.get_usuario_role();

  if v_empresa_id is null then
    return jsonb_build_object('ok', false, 'erro', 'Usuario sem empresa ativa.');
  end if;

  if v_role not in ('dono', 'admin_empresa', 'gerente') then
    return jsonb_build_object('ok', false, 'erro', 'Voce nao tem permissao para revogar dispositivos.');
  end if;

  select d.id, d.nome, d.ativo
  into v_dispositivo
  from farmsafe.dispositivos d
  where d.id = p_dispositivo_id
    and d.empresa_id = v_empresa_id
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'erro', 'Dispositivo nao encontrado nesta empresa.');
  end if;

  update farmsafe.dispositivos
  set ativo = false,
      revogado_em = coalesce(revogado_em, now()),
      revogado_por = coalesce(revogado_por, auth.uid()),
      revogacao_motivo = nullif(trim(coalesce(p_motivo, '')), ''),
      updated_at = now()
  where id = p_dispositivo_id
    and empresa_id = v_empresa_id;

  return jsonb_build_object(
    'ok', true,
    'mensagem', 'Dispositivo revogado com seguranca.',
    'dispositivo_id', p_dispositivo_id
  );
end;
$$;

create or replace function farmsafe.admin_reativar_dispositivo(
  p_dispositivo_id uuid
)
returns jsonb
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
    return jsonb_build_object('ok', false, 'erro', 'Usuario sem empresa ativa.');
  end if;

  if v_role not in ('dono', 'admin_empresa') then
    return jsonb_build_object('ok', false, 'erro', 'Somente dono ou admin podem reativar dispositivos.');
  end if;

  update farmsafe.dispositivos
  set ativo = true,
      revogado_em = null,
      revogado_por = null,
      revogacao_motivo = null,
      updated_at = now()
  where id = p_dispositivo_id
    and empresa_id = v_empresa_id;

  if not found then
    return jsonb_build_object('ok', false, 'erro', 'Dispositivo nao encontrado nesta empresa.');
  end if;

  return jsonb_build_object(
    'ok', true,
    'mensagem', 'Dispositivo reativado.',
    'dispositivo_id', p_dispositivo_id
  );
end;
$$;

revoke execute on function farmsafe.criar_setup_empresa_inicial(
  text, text, text, text, text
) from public;
grant execute on function farmsafe.criar_setup_empresa_inicial(
  text, text, text, text, text
) to authenticated;

revoke execute on function farmsafe.admin_revogar_dispositivo(uuid, text) from public;
revoke execute on function farmsafe.admin_revogar_dispositivo(uuid, text) from anon;
grant execute on function farmsafe.admin_revogar_dispositivo(uuid, text) to authenticated;

revoke execute on function farmsafe.admin_reativar_dispositivo(uuid) from public;
revoke execute on function farmsafe.admin_reativar_dispositivo(uuid) from anon;
grant execute on function farmsafe.admin_reativar_dispositivo(uuid) to authenticated;

commit;
