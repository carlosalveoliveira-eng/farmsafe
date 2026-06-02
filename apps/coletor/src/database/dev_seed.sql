INSERT INTO farmsafe.fazendas (
  id, nome, codigo, cidade, estado
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Fazenda Teste',
  'FAZ-001',
  'Barra do Bugres',
  'MT'
);

INSERT INTO farmsafe.retiros (
  id, fazenda_id, nome
) VALUES (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'Retiro Principal'
);

INSERT INTO farmsafe.lotes (
  id, fazenda_id, retiro_id, nome, descricao
) VALUES (
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'Lote 01',
  'Lote de teste'
);

INSERT INTO farmsafe.cochos (
  id, fazenda_id, retiro_id, lote_id, nome, codigo_qr, tipo_sal, capacidade_kg
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  'Cocho 001',
  'FS-COCHO-001',
  'sal_mineral',
  100
);

INSERT INTO farmsafe.dispositivos (
  id, fazenda_id, nome, device_secret, tratador_nome
) VALUES (
  '44444444-4444-4444-4444-444444444444',
  '11111111-1111-1111-1111-111111111111',
  'Dispositivo Teste',
  'DEV-TESTE-001',
  'Tratador Teste'
);