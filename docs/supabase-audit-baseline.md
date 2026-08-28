# FarmSafe Supabase Remote Baseline

Data da auditoria: 2026-08-28

Projeto remoto:

- Nome: `farmsafe-main`
- Ref: `arqkclxwxjvgkkzopjxa`
- Regiao: `sa-east-1`
- Status: `ACTIVE_HEALTHY`
- Postgres: `17.6`

## Limites da auditoria

- A Supabase CLI nao estava instalada no PATH; foi executada via `npx supabase`.
- Docker Desktop nao esta disponivel, entao `supabase db dump` nao conseguiu gerar dump completo.
- As consultas remotas foram feitas via `supabase db query --linked --project-ref`.
- `supabase_migrations.schema_migrations` nao existe no remoto consultado, entao nao ha historico padrao de migrations acessivel por essa tabela.

## Regra de preservacao de dados

O FarmSafe ja possui dados reais de testes em uso. Portanto, qualquer correcao de estrutura deve seguir `docs/database-safety-policy.md`.

Na pratica:

- nao apagar tabelas;
- nao apagar dados existentes;
- nao recriar banco;
- nao usar reset remoto;
- corrigir divergencias com migrations incrementais, idempotentes e verificaveis.

## Conclusoes principais

1. O remoto esta a frente do repositorio local.
2. A RPC real `farmsafe.registrar_abastecimento_coletor` e compativel com o coletor atual.
3. O arquivo local `supabase/farmsafe-functions.sql` esta obsoleto para a RPC de sync.
4. Todas as tabelas reais do schema `farmsafe` auditadas estao com RLS habilitada.
5. Existem grants publicos herdados em algumas funcoes `SECURITY DEFINER`; a migration `20260828034716_baseline_remote_rpc_contract.sql` registra hardening inicial para RPCs administrativas.

## RPC critica: coletor

Contrato real no remoto:

```sql
farmsafe.registrar_abastecimento_coletor(
  p_device_secret text,
  p_client_uuid text,
  p_codigo_qr text,
  p_insumo_id uuid,
  p_quantidade_kg numeric,
  p_observacao text default null,
  p_status_cocho text default null,
  p_leitura_cocho numeric default null,
  p_latitude numeric default null,
  p_longitude numeric default null,
  p_gps_accuracy numeric default null,
  p_registrado_em timestamptz default now()
)
returns jsonb
security definer
```

Compatibilidade com codigo:

- `apps/coletor/src/services/sync.ts` chama os parametros novos.
- O remoto aceita os parametros novos.
- `supabase/farmsafe-functions.sql` ainda usa contrato antigo com `p_cocho_id`, `p_lote_id` e `p_tipo_abastecimento`.

## Tabelas com RLS habilitada

Confirmadas no remoto:

- `abastecimentos`
- `app_versions`
- `cochos`
- `cotacoes_mercado`
- `dispositivos`
- `documentos_fiscais`
- `documentos_fiscais_itens`
- `documentos_fiscais_pagamentos`
- `empresa_documentos_fiscais`
- `empresas`
- `estoque_movimentacoes`
- `fazendas`
- `insumos`
- `logs_operacionais`
- `lotes`
- `map_areas`
- `maps`
- `retiros`
- `usuarios`

## Colunas relevantes confirmadas

### `farmsafe.maps`

- `id uuid not null`
- `empresa_id uuid not null`
- `fazenda_id uuid not null`
- `nome text not null`
- `arquivo_original text`
- `arquivo_processado text`
- `geojson jsonb not null`
- `versao integer`
- `ativo boolean`
- `created_by uuid`
- `created_at timestamptz`
- `updated_at timestamptz`

### `farmsafe.map_areas`

- `id uuid not null`
- `map_id uuid not null`
- `empresa_id uuid not null`
- `fazenda_id uuid not null`
- `nome text not null`
- `tipo text not null`
- `cor text`
- `geojson jsonb not null`
- `area_hectares numeric`
- `created_at timestamptz`
- `updated_at timestamptz`

### `farmsafe.abastecimentos`

O remoto ja possui campos novos usados pelo coletor:

- `insumo_id uuid`
- `status_cocho text`
- `leitura_cocho numeric`
- `gps_accuracy numeric`
- `origem_registro text`

## Storage

Policies em `storage.objects` confirmadas:

- `maps_storage_insert`
- `maps_storage_select`
- `maps_storage_update`
- `maps_storage_delete`
- `documentos_fiscais_storage_insert`
- `documentos_fiscais_storage_select`
- `documentos_fiscais_storage_update`

Todas aparecem para role `authenticated`. A proxima auditoria deve revisar `qual` e `with_check` dessas policies por path e `empresa_id`.

## View

Existe uma view no schema `farmsafe`:

- `vw_status_cochos`

Ela calcula status operacional por ultimo abastecimento:

- sem registro
- atrasado quando >= 24h
- atencao quando >= 12h
- ok abaixo disso

Ponto de seguranca pendente: confirmar se a view usa `security_invoker = true` ou se os grants impedem bypass de RLS.

## Permissoes de funcoes

RPCs anon/autenticadas confirmadas:

- `ativar_dispositivo(text)`
- `coletor_obter_carga(text)`
- `coletor_verificar_atualizacao(text, text, text, integer)`
- `registrar_abastecimento_coletor(...)`
- `sync_abastecimento(...)` legado

RPCs autenticadas confirmadas:

- `listar_saldos_insumos()`
- `processar_documento_fiscal_estoque(uuid, uuid, uuid)`

Ponto de hardening:

- `admin_listar_usuarios()` e `admin_atualizar_usuario(...)` tinham ACL com entrada publica (`=X/postgres`) no remoto.
- A migration nova revoga `public` e `anon` explicitamente dessas funcoes.

## Backlog imediato da Fase 1

1. Gerar dump SQL completo quando Docker ou `pg_dump` estiver disponivel.
2. Mover/absorver o conteudo de `database/migrations` para o fluxo padrao `supabase/migrations`.
3. Substituir ou arquivar `supabase/farmsafe-functions.sql`, que esta divergente.
4. Confirmar historico real de migrations no painel Supabase, ja que a tabela padrao nao apareceu.
5. Rodar `supabase db advisors` novamente em janela mais estavel; a chamada via CLI ficou sem resposta.
