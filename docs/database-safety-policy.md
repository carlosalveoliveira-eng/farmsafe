# FarmSafe Database Safety Policy

O FarmSafe ja possui dados reais de testes em uso.

Por isso, qualquer alteracao de banco deve seguir estas regras:

## Operacoes proibidas sem aprovacao explicita e plano de backup

- `drop table`
- `drop schema`
- `truncate`
- recriar banco
- resetar banco remoto
- apagar dados existentes para "corrigir" estrutura
- substituir tabela por outra vazia
- remover coluna com dados sem migracao previa
- alterar tipo de coluna sem validacao de compatibilidade

## Padrao permitido

Toda correcao deve ser incremental e preservar dados:

- `alter table ... add column if not exists`
- `create index concurrently` quando aplicavel
- `create or replace function` para corrigir RPC
- `create policy` / `alter policy` / `drop policy` somente quando substituir por policy equivalente ou mais segura
- `grant` / `revoke` para reduzir superficie de acesso
- backfill idempotente com `where coluna is null`
- constraints em duas fases quando houver dados existentes

## Fluxo obrigatorio

1. Auditar estado remoto.
2. Escrever migration idempotente.
3. Testar em ambiente seguro quando possivel.
4. Aplicar no remoto sem apagar dados.
5. Verificar com consulta de catalogo ou chamada real.
6. Registrar no Git.

## Constraints em duas fases

Quando uma coluna existente precisa virar obrigatoria:

1. Criar coluna ou validar existencia.
2. Fazer backfill sem sobrescrever valores existentes.
3. Consultar registros invalidos restantes.
4. Somente depois aplicar `set not null` ou `check`.

## Dispositivos

Dispositivos devem ser revogados por estado, nunca apagados:

- preferir `ativo = false`
- registrar data/motivo/usuario da revogacao quando os campos existirem
- manter historico de abastecimentos e sincronizacoes

## Migrations

Novas migrations devem ser criadas com:

```powershell
npx supabase migration new nome_descritivo
```

Nao criar nome de migration manualmente.

## Regra de ouro

Dados reais vencem elegancia de schema. Primeiro preserva, depois organiza.
