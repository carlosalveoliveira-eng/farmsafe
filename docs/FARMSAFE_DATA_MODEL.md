# FarmSafe Data Model

Data: 2026-08-30

## Modelo Atual Observado

```text
empresas
  -> usuarios
  -> fazendas
    -> retiros
    -> lotes
    -> cochos
    -> maps
      -> map_areas
    -> dispositivos
    -> abastecimentos
      -> estoque_movimentacoes

insumos
  -> estoque_movimentacoes
  -> abastecimentos

documentos_fiscais
  -> documentos_fiscais_itens
  -> documentos_fiscais_pagamentos
  -> estoque_movimentacoes

app_versions
  -> coletor_verificar_atualizacao

logs_operacionais
  -> eventos/auditoria operacional parcial
```

## Entidades

### Empresas

Implementado.

Campos relevantes: `id`, `nome`, `plano`, limites de fazendas/dispositivos.

Recomendado: status comercial (`ativa`, `trial`, `suspensa`, `encerrada`), periodo de trial, limites efetivos por plano, motivo de suspensao.

### Usuarios

Implementado.

Relação com Auth por `auth_user_id`. Roles atuais: `dono`, `admin_empresa`, `gerente`, `controller`, `escritorio`.

Recomendado: matriz formal de permissoes, status de ciclo de vida, trilha de auditoria, ultimo acesso.

### Fazendas

Implementado.

Possui `empresa_id`, localizacao, raio operacional e ativo.

Recomendado: endereco estruturado, codigo IBGE, area declarada vs area geoespacial, status operacional.

### Retiros

Implementado.

Recomendado: ligar melhor com areas do mapa quando um retiro for poligono operacional.

### Lotes

Implementado parcialmente.

Campos observados: fazenda, retiro, `map_area_id`, quantidade de animais, descricao, ativo.

Recomendado: historico temporal de lotacao, categoria, peso medio, datas de entrada/saida, subdivisoes com origem rastreavel.

### Animais

Ausente como entidade individual.

Recomendacao: nao criar agora se o MVP trabalha por lote. Planejar apenas se o produto vender rastreabilidade individual.

### Cochos

Implementado.

Campos: fazenda, retiro, lote, QR, tipo, capacidade, coordenadas, `map_area_id`, ativo.

Recomendado: historico de reposicionamento, tipo fisico, capacidade calibrada, status de manutencao.

### Abastecimentos

Implementado.

Campos: `client_uuid`, dispositivo, fazenda, cocho, lote, insumo, quantidade, GPS, status do cocho, leitura, origem, timestamps.

Bom: idempotencia por `empresa_id + client_uuid`.

Recomendado: nunca apagar; corrigir com eventos compensatorios. Validar relogio do dispositivo e precisao GPS.

### Insumos

Implementado.

Campos: categoria, unidade kg, minimo/maximo, ativo.

Recomendado: codigo interno, fornecedor preferencial, conversoes por embalagem, custo medio.

### Estoque

Implementado como movimentacao historica.

Tipos existentes suportam entrada, saida, consumo, ajustes e transferencias.

Recomendado: impedir updates historicos diretos; usar ajustes. Criar escopo de estoque por local quando processo exigir.

### NF-e / Fiscal

Implementado parcialmente.

Entidades: documento permitido, documentos fiscais, itens, pagamentos.

Recomendado: validar XML, chave duplicada, destinatario permitido, idempotencia e processamento transacional completo.

### Mapas

Implementado.

`maps` guarda versao ativa e caminhos de Storage. `map_areas` guarda areas operacionais.

Recomendado: versionamento sem delete fisico, auditoria de edicao, PostGIS incremental se volume crescer.

### Dispositivos

Implementado.

Campos: fazenda, empresa, nome, tratador, ativo, `device_secret`, ultimo sync, revogacao.

Recomendado: segredo hasheado, rotacao, versionamento do app, storage seguro, device fingerprint nao invasivo.

### Logs

Implementado parcialmente.

Recomendado: separar auditoria, log tecnico e log operacional.

## Modelo Recomendado Futuro

```text
empresa
  -> plano_assinatura
  -> usuarios_empresa
    -> permissoes
  -> fazendas
    -> locais_estoque
    -> retiros
    -> areas_operacionais
    -> lotes
      -> lote_movimentacoes
      -> lote_subdivisoes
    -> cochos
      -> cocho_eventos
    -> dispositivos
      -> device_sessions/credential_rotations
    -> abastecimentos
      -> abastecimento_eventos
    -> estoque_movimentacoes
    -> mapas
      -> mapa_versoes
      -> map_areas
  -> auditoria
```

## Lacunas

PROBLEMA: permissao por papel incompleta.

IMPACTO: usuario da empresa pode executar escrita que deveria ser restrita.

SOLUCAO: matriz de permissoes e policies/RPCs por caso de uso.

ALTERNATIVAS: esconder botoes no frontend apenas, mas isso nao protege API.

RECOMENDACAO: aplicar no banco/RPC e refletir na UI.

PROBLEMA: `device_secret` em texto utilizavel.

IMPACTO: clonagem de coletor.

SOLUCAO: Secure Storage no cliente e hash/rotacao no servidor.

ALTERNATIVAS: manter localStorage durante piloto controlado.

RECOMENDACAO: migrar antes de escala comercial.

PROBLEMA: estoque permite fluxo direto por Data API.

IMPACTO: historico pode ser alterado sem regra transacional central.

SOLUCAO: RPCs transacionais e ajustes compensatorios.

ALTERNATIVAS: reforcar UI e RLS simples.

RECOMENDACAO: centralizar operacoes criticas.

PROBLEMA: mapas em JSONB sem PostGIS.

IMPACTO: frontend carrega e calcula mais quando crescer.

SOLUCAO: PostGIS incremental para validacao espacial, indices e consultas por area.

ALTERNATIVAS: manter GeoJSON no MVP.

RECOMENDACAO: manter GeoJSON por enquanto; planejar PostGIS quando volume justificar.
