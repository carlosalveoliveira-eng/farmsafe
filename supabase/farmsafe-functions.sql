
DECLARE
  v_dispositivo farmsafe.dispositivos%ROWTYPE;
  v_cocho farmsafe.cochos%ROWTYPE;
  v_abastecimento_id uuid;
BEGIN
  SELECT *
  INTO v_dispositivo
  FROM farmsafe.dispositivos
  WHERE upper(trim(device_secret)) = upper(trim(p_device_secret))
  LIMIT 1;

  IF v_dispositivo.id IS NULL THEN
    RETURN json_build_object('ok', false, 'erro', 'Dispositivo não encontrado.');
  END IF;

  IF v_dispositivo.ativo IS NOT TRUE THEN
    RETURN json_build_object('ok', false, 'erro', 'Dispositivo inativo.');
  END IF;

  SELECT *
  INTO v_cocho
  FROM farmsafe.cochos
  WHERE empresa_id = v_dispositivo.empresa_id
    AND ativo = true
    AND (
      codigo_qr = p_cocho_id
      OR id::text = p_cocho_id
    )
  LIMIT 1;

  IF v_cocho.id IS NULL THEN
    RETURN json_build_object('ok', false, 'erro', 'Cocho não encontrado ou QR inválido.');
  END IF;

  IF v_dispositivo.fazenda_id IS NOT NULL
     AND v_cocho.fazenda_id <> v_dispositivo.fazenda_id THEN
    RETURN json_build_object('ok', false, 'erro', 'Este dispositivo não pode registrar cochos de outra fazenda.');
  END IF;

  SELECT id
  INTO v_abastecimento_id
  FROM farmsafe.abastecimentos
  WHERE client_uuid = p_client_uuid::text
  LIMIT 1;

  IF v_abastecimento_id IS NOT NULL THEN
    UPDATE farmsafe.dispositivos
    SET ultimo_sync = now()
    WHERE id = v_dispositivo.id;

    RETURN json_build_object(
      'ok', true,
      'status', 'already_exists',
      'id', v_abastecimento_id
    );
  END IF;

  INSERT INTO farmsafe.abastecimentos (
    empresa_id,
    fazenda_id,
    client_uuid,
    dispositivo_id,
    cocho_id,
    lote_id,
    tipo_abastecimento,
    quantidade_kg,
    observacao,
    latitude,
    longitude,
    registrado_em,
    sincronizado_em
  )
  VALUES (
    v_dispositivo.empresa_id,
    v_cocho.fazenda_id,
    p_client_uuid::text,
    v_dispositivo.id,
    v_cocho.id,
    COALESCE(p_lote_id, v_cocho.lote_id),
    p_tipo_abastecimento,
    p_quantidade_kg,
    p_observacao,
    p_latitude,
    p_longitude,
    p_registrado_em,
    now()
  )
  RETURNING id INTO v_abastecimento_id;

  UPDATE farmsafe.dispositivos
  SET ultimo_sync = now()
  WHERE id = v_dispositivo.id;

  RETURN json_build_object(
    'ok', true,
    'status', 'inserted',
    'id', v_abastecimento_id
  );
END;



DECLARE
  v_dispositivo farmsafe.dispositivos%ROWTYPE;
BEGIN
  SELECT *
  INTO v_dispositivo
  FROM farmsafe.dispositivos
  WHERE device_secret = upper(trim(p_device_secret))
  LIMIT 1;

  IF v_dispositivo.id IS NULL THEN
    RETURN json_build_object(
      'ok', false,
      'erro', 'Código inválido.'
    );
  END IF;

  IF v_dispositivo.ativo IS NOT TRUE THEN
    RETURN json_build_object(
      'ok', false,
      'erro', 'Dispositivo inativo.'
    );
  END IF;

  RETURN json_build_object(
    'ok', true,
    'id', v_dispositivo.id,
    'nome', v_dispositivo.nome,
    'tratador_nome', v_dispositivo.tratador_nome
  );
END;



DECLARE
  v_fazenda farmsafe.fazendas%ROWTYPE;
  v_numero integer;
BEGIN
  SELECT *
  INTO v_fazenda
  FROM farmsafe.fazendas
  WHERE id = p_fazenda_id
  LIMIT 1;

  IF v_fazenda.id IS NULL THEN
    RAISE EXCEPTION 'Fazenda não encontrada.';
  END IF;

  v_numero := COALESCE(v_fazenda.ultimo_numero_cocho, 0) + 1;

  UPDATE farmsafe.fazendas
  SET ultimo_numero_cocho = v_numero
  WHERE id = p_fazenda_id;

  RETURN
    v_fazenda.codigo_publico ||
    '-COCHO-' ||
    lpad(v_numero::text, 4, '0');
END;



DECLARE
  v_codigo text;
BEGIN
  LOOP
    v_codigo :=
      'FAZ-' ||
      upper(substr(md5(random()::text), 1, 4));

    EXIT WHEN NOT EXISTS (
      SELECT 1
      FROM farmsafe.fazendas
      WHERE codigo_publico = v_codigo
    );
  END LOOP;

  RETURN v_codigo;
END;


