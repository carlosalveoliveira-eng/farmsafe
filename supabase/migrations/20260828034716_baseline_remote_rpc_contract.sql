begin;

-- Baseline captured from remote project farmsafe-main on 2026-08-28.
-- Purpose:
-- - Register the real collector RPC contract in the repository.
-- - Keep existing data untouched.
-- - Harden function EXECUTE privileges explicitly.

create or replace function farmsafe.registrar_abastecimento_coletor(
  p_device_secret text,
  p_client_uuid text,
  p_codigo_qr text,
  p_insumo_id uuid,
  p_quantidade_kg numeric,
  p_observacao text default null::text,
  p_status_cocho text default null::text,
  p_leitura_cocho numeric default null::numeric,
  p_latitude numeric default null::numeric,
  p_longitude numeric default null::numeric,
  p_gps_accuracy numeric default null::numeric,
  p_registrado_em timestamp with time zone default now()
)
returns jsonb
language plpgsql
security definer
set search_path = farmsafe, public
as $$
declare
  v_dispositivo record;
  v_cocho record;
  v_insumo record;
  v_empresa_id uuid;
  v_client_uuid text;
  v_codigo_qr text;
  v_status_cocho text;
  v_abastecimento_id uuid;
  v_saldo_antes numeric(14,3) := 0;
  v_saldo_depois numeric(14,3) := 0;
  v_estoque_status text := 'normal';
  v_mensagem_validacao text := null;
  v_status_retorno text := 'sincronizado';
  v_existente record;
  v_registrado_em timestamptz;
begin
  v_client_uuid := nullif(trim(coalesce(p_client_uuid, '')), '');
  v_codigo_qr := nullif(trim(coalesce(p_codigo_qr, '')), '');
  v_status_cocho := nullif(lower(trim(coalesce(p_status_cocho, ''))), '');
  v_registrado_em := coalesce(p_registrado_em, now());

  if nullif(trim(coalesce(p_device_secret, '')), '') is null then
    return jsonb_build_object('ok', false, 'status', 'erro', 'codigo', 'DEVICE_SECRET_OBRIGATORIO', 'mensagem', 'Dispositivo nao informado.');
  end if;

  if v_client_uuid is null then
    return jsonb_build_object('ok', false, 'status', 'erro', 'codigo', 'CLIENT_UUID_OBRIGATORIO', 'mensagem', 'Identificador local do registro nao informado.');
  end if;

  if v_codigo_qr is null then
    return jsonb_build_object('ok', false, 'status', 'erro', 'codigo', 'QR_OBRIGATORIO', 'mensagem', 'Codigo do cocho nao informado.');
  end if;

  if p_insumo_id is null then
    return jsonb_build_object('ok', false, 'status', 'erro', 'codigo', 'INSUMO_OBRIGATORIO', 'mensagem', 'Insumo nao informado.');
  end if;

  if p_quantidade_kg is null or p_quantidade_kg <= 0 then
    return jsonb_build_object('ok', false, 'status', 'erro', 'codigo', 'QUANTIDADE_INVALIDA', 'mensagem', 'A quantidade precisa ser maior que zero.');
  end if;

  if p_quantidade_kg > 100000 then
    return jsonb_build_object('ok', false, 'status', 'erro', 'codigo', 'QUANTIDADE_EXCESSIVA', 'mensagem', 'Quantidade muito alta para um abastecimento.');
  end if;

  if v_status_cocho is not null
     and v_status_cocho not in ('vazio', 'baixo', 'medio', 'cheio', 'nao_informado') then
    return jsonb_build_object('ok', false, 'status', 'erro', 'codigo', 'STATUS_COCHO_INVALIDO', 'mensagem', 'Status do cocho invalido.');
  end if;

  select
    d.id,
    d.nome,
    d.tratador_nome,
    d.fazenda_id,
    coalesce(d.empresa_id, f.empresa_id) as empresa_id
  into v_dispositivo
  from farmsafe.dispositivos d
  join farmsafe.fazendas f on f.id = d.fazenda_id
  where d.device_secret = p_device_secret
    and d.ativo is true
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'status', 'erro', 'codigo', 'DISPOSITIVO_INVALIDO', 'mensagem', 'Dispositivo nao autorizado ou inativo.');
  end if;

  v_empresa_id := v_dispositivo.empresa_id;

  if v_empresa_id is null then
    return jsonb_build_object('ok', false, 'status', 'erro', 'codigo', 'DISPOSITIVO_SEM_EMPRESA', 'mensagem', 'Dispositivo sem empresa vinculada.');
  end if;

  select
    a.id,
    a.cocho_id,
    a.insumo_id,
    a.quantidade_kg,
    a.registrado_em,
    a.sincronizado_em
  into v_existente
  from farmsafe.abastecimentos a
  where a.empresa_id = v_empresa_id
    and a.client_uuid = v_client_uuid
  limit 1;

  if found then
    return jsonb_build_object(
      'ok', true,
      'status', 'duplicado',
      'mensagem', 'Registro ja sincronizado anteriormente.',
      'abastecimento_id', v_existente.id,
      'registrado_em', v_existente.registrado_em,
      'sincronizado_em', v_existente.sincronizado_em
    );
  end if;

  select
    c.id,
    c.nome,
    c.fazenda_id,
    c.retiro_id,
    c.lote_id,
    c.codigo_qr
  into v_cocho
  from farmsafe.cochos c
  where c.codigo_qr = v_codigo_qr
    and c.fazenda_id = v_dispositivo.fazenda_id
    and c.ativo is true
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'status', 'erro', 'codigo', 'COCHO_INVALIDO', 'mensagem', 'Cocho nao encontrado ou inativo para este dispositivo.');
  end if;

  select
    i.id,
    i.nome,
    i.estoque_minimo_kg,
    i.estoque_maximo_kg
  into v_insumo
  from farmsafe.insumos i
  where i.id = p_insumo_id
    and i.empresa_id = v_empresa_id
    and i.ativo is true
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'status', 'erro', 'codigo', 'INSUMO_INVALIDO', 'mensagem', 'Insumo nao encontrado ou inativo para esta empresa.');
  end if;

  select coalesce(sum(
    case
      when tipo in ('entrada', 'ajuste_entrada', 'transferencia_entrada', 'saldo_inicial') then quantidade_kg
      when tipo in ('saida', 'consumo', 'ajuste_saida', 'transferencia_saida') then -quantidade_kg
      else 0
    end
  ), 0)
  into v_saldo_antes
  from farmsafe.estoque_movimentacoes
  where empresa_id = v_empresa_id
    and insumo_id = p_insumo_id;

  v_saldo_depois := v_saldo_antes - p_quantidade_kg;

  if v_saldo_depois < 0 then
    v_estoque_status := 'negativo';
    v_status_retorno := 'sincronizado_com_alerta';
    v_mensagem_validacao := 'Estoque ficou negativo apos o abastecimento. Verifique entradas manuais ou NF-e pendente.';
  elsif v_insumo.estoque_minimo_kg is not null and v_saldo_depois < v_insumo.estoque_minimo_kg then
    v_estoque_status := 'abaixo_minimo';
    v_status_retorno := 'sincronizado_com_alerta';
    v_mensagem_validacao := 'Estoque abaixo do minimo apos o abastecimento.';
  elsif v_insumo.estoque_maximo_kg is not null and v_saldo_depois > v_insumo.estoque_maximo_kg then
    v_estoque_status := 'acima_maximo';
    v_status_retorno := 'sincronizado_com_alerta';
    v_mensagem_validacao := 'Estoque acima do maximo planejado.';
  else
    v_estoque_status := 'normal';
  end if;

  insert into farmsafe.abastecimentos (
    empresa_id,
    client_uuid,
    dispositivo_id,
    fazenda_id,
    cocho_id,
    lote_id,
    tipo_abastecimento,
    quantidade_kg,
    insumo_id,
    observacao,
    latitude,
    longitude,
    gps_accuracy,
    status_cocho,
    leitura_cocho,
    origem_registro,
    registrado_em,
    sincronizado_em
  )
  values (
    v_empresa_id,
    v_client_uuid,
    v_dispositivo.id,
    v_cocho.fazenda_id,
    v_cocho.id,
    v_cocho.lote_id,
    'coletor',
    p_quantidade_kg,
    p_insumo_id,
    nullif(trim(coalesce(p_observacao, '')), ''),
    p_latitude,
    p_longitude,
    p_gps_accuracy,
    v_status_cocho,
    p_leitura_cocho,
    'coletor',
    v_registrado_em,
    now()
  )
  returning id into v_abastecimento_id;

  insert into farmsafe.estoque_movimentacoes (
    empresa_id,
    insumo_id,
    fazenda_id,
    retiro_id,
    tipo,
    quantidade_kg,
    origem,
    abastecimento_id,
    data_movimentacao,
    documento_referencia,
    pessoa_referencia,
    observacao,
    saldo_antes_kg,
    saldo_depois_kg,
    estoque_status,
    mensagem_validacao
  )
  values (
    v_empresa_id,
    p_insumo_id,
    v_cocho.fazenda_id,
    v_cocho.retiro_id,
    'consumo',
    p_quantidade_kg,
    'coletor',
    v_abastecimento_id,
    v_registrado_em,
    'Coletor ' || v_client_uuid,
    coalesce(v_dispositivo.tratador_nome, v_dispositivo.nome),
    nullif(trim(coalesce(p_observacao, '')), ''),
    v_saldo_antes,
    v_saldo_depois,
    v_estoque_status,
    v_mensagem_validacao
  );

  update farmsafe.dispositivos
  set ultimo_sync = now(),
      empresa_id = coalesce(empresa_id, v_empresa_id),
      updated_at = now()
  where id = v_dispositivo.id;

  return jsonb_build_object(
    'ok', true,
    'status', v_status_retorno,
    'mensagem', coalesce(v_mensagem_validacao, 'Abastecimento sincronizado com sucesso.'),
    'abastecimento_id', v_abastecimento_id,
    'cocho_id', v_cocho.id,
    'cocho_nome', v_cocho.nome,
    'insumo_id', v_insumo.id,
    'insumo_nome', v_insumo.nome,
    'quantidade_kg', p_quantidade_kg,
    'saldo_antes_kg', v_saldo_antes,
    'saldo_depois_kg', v_saldo_depois,
    'estoque_status', v_estoque_status,
    'registrado_em', v_registrado_em,
    'sincronizado_em', now()
  );
end;
$$;

revoke execute on function farmsafe.registrar_abastecimento_coletor(
  text, text, text, uuid, numeric, text, text, numeric, numeric, numeric, numeric, timestamp with time zone
) from public;

grant execute on function farmsafe.registrar_abastecimento_coletor(
  text, text, text, uuid, numeric, text, text, numeric, numeric, numeric, numeric, timestamp with time zone
) to anon, authenticated;

revoke execute on function farmsafe.admin_listar_usuarios() from public;
revoke execute on function farmsafe.admin_listar_usuarios() from anon;
grant execute on function farmsafe.admin_listar_usuarios() to authenticated;

revoke execute on function farmsafe.admin_atualizar_usuario(
  uuid, text, text, text, text, text, boolean
) from public;
revoke execute on function farmsafe.admin_atualizar_usuario(
  uuid, text, text, text, text, text, boolean
) from anon;
grant execute on function farmsafe.admin_atualizar_usuario(
  uuid, text, text, text, text, text, boolean
) to authenticated;

commit;
