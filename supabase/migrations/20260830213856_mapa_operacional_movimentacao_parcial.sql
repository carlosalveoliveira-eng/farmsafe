set search_path = farmsafe, public;

create or replace function farmsafe.mover_lote_mapa(
  p_lote_id uuid,
  p_destino_area_id uuid,
  p_quantidade integer default null,
  p_observacao text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = farmsafe, public
as $$
declare
  v_lote farmsafe.lotes%rowtype;
  v_destino farmsafe.map_areas%rowtype;
  v_quantidade integer;
  v_novo_lote_id uuid;
  v_resultado text;
begin
  select *
    into v_lote
  from farmsafe.lotes
  where id = p_lote_id
    and empresa_id = farmsafe.get_empresa_id()
  for update;

  if not found then
    raise exception 'Lote nao encontrado ou sem permissao.';
  end if;

  select *
    into v_destino
  from farmsafe.map_areas
  where id = p_destino_area_id
    and empresa_id = farmsafe.get_empresa_id()
    and fazenda_id = v_lote.fazenda_id;

  if not found then
    raise exception 'Pasto/area de destino nao encontrado.';
  end if;

  if v_destino.tipo not in ('pasto', 'retiro') then
    raise exception 'O destino precisa ser um pasto ou retiro.';
  end if;

  if v_lote.quantidade_animais is null then
    update farmsafe.lotes
       set map_area_id = v_destino.id,
           updated_at = now()
     where id = v_lote.id;

    v_novo_lote_id := v_lote.id;
    v_resultado := 'movido_sem_quantidade';
  else
    v_quantidade := coalesce(p_quantidade, v_lote.quantidade_animais);

    if v_quantidade <= 0 then
      raise exception 'Quantidade precisa ser maior que zero.';
    end if;

    if v_quantidade > v_lote.quantidade_animais then
      raise exception 'Quantidade maior que o total do lote.';
    end if;

    if v_quantidade = v_lote.quantidade_animais then
      update farmsafe.lotes
         set map_area_id = v_destino.id,
             updated_at = now()
       where id = v_lote.id;

      v_novo_lote_id := v_lote.id;
      v_resultado := 'movido_total';
    else
      update farmsafe.lotes
         set quantidade_animais = v_lote.quantidade_animais - v_quantidade,
             updated_at = now()
       where id = v_lote.id;

      insert into farmsafe.lotes (
        empresa_id,
        fazenda_id,
        retiro_id,
        nome,
        descricao,
        quantidade_animais,
        ativo,
        map_area_id,
        created_at,
        updated_at
      )
      values (
        v_lote.empresa_id,
        v_lote.fazenda_id,
        v_lote.retiro_id,
        v_lote.nome || ' - subdivisao',
        coalesce(v_lote.descricao, '') ||
          case when coalesce(v_lote.descricao, '') = '' then '' else E'\n' end ||
          'Subdivisao criada pelo mapa operacional.',
        v_quantidade,
        true,
        v_destino.id,
        now(),
        now()
      )
      returning id into v_novo_lote_id;

      v_resultado := 'subdividido';
    end if;
  end if;

  insert into farmsafe.lote_map_movimentacoes (
    empresa_id,
    fazenda_id,
    lote_id,
    map_area_origem_id,
    map_area_destino_id,
    moved_by,
    observacao
  )
  values (
    v_lote.empresa_id,
    v_lote.fazenda_id,
    v_novo_lote_id,
    v_lote.map_area_id,
    v_destino.id,
    auth.uid(),
    p_observacao
  );

  return jsonb_build_object(
    'status', v_resultado,
    'lote_origem_id', v_lote.id,
    'lote_destino_id', v_novo_lote_id,
    'quantidade_movida', v_quantidade,
    'destino_area_id', v_destino.id
  );
end;
$$;

revoke all on function farmsafe.mover_lote_mapa(uuid, uuid, integer, text)
  from public, anon;

grant execute on function farmsafe.mover_lote_mapa(uuid, uuid, integer, text)
  to authenticated;

comment on function farmsafe.mover_lote_mapa(uuid, uuid, integer, text) is
  'Move lote no mapa operacional. Quando a quantidade for parcial, reduz o lote original e cria uma subdivisao rastreavel.';
