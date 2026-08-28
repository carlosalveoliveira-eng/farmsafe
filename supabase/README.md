# FarmSafe Supabase Workflow

Este diretorio passa a ser a fonte padrao para novas migrations do Supabase.

## Regra principal

O FarmSafe possui dados reais de testes em uso. Nao usar reset remoto, recriacao de banco, `drop table` ou `truncate`.

Consulte:

- `docs/database-safety-policy.md`
- `docs/supabase-audit-baseline.md`

## Criar migration

```powershell
npx supabase migration new nome_descritivo
```

Depois edite o arquivo criado em `supabase/migrations`.

## Aplicar mudanca controlada no remoto

Enquanto o historico de migrations remoto estiver sendo normalizado, aplicar SQL pontual com:

```powershell
npx supabase db query --linked --project-ref arqkclxwxjvgkkzopjxa --file supabase\migrations\nome_da_migration.sql
```

## Verificar

Use consultas de catalogo apos cada mudanca:

```powershell
npx supabase db query --linked --project-ref arqkclxwxjvgkkzopjxa "select now();"
```

## Legado

`database/migrations` contem migrations historicas anteriores a padronizacao. Elas nao devem ser apagadas. Novas migrations devem entrar em `supabase/migrations`.
