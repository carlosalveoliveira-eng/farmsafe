# FarmSafe Production Readiness Checklist

Use este checklist antes de vender, demonstrar para cliente real ou ativar uma nova empresa em producao.

## Ambientes

- [ ] `apps/web` possui `VITE_SUPABASE_URL` configurado no ambiente de deploy.
- [ ] `apps/web` possui `VITE_SUPABASE_ANON_KEY` configurado no ambiente de deploy.
- [ ] `apps/coletor` possui `VITE_SUPABASE_URL` correto no build do APK.
- [ ] `apps/coletor` possui `VITE_SUPABASE_ANON_KEY` correto no build do APK.
- [ ] Edge Function `admin-convidar-usuario` possui `SUPABASE_URL`.
- [ ] Edge Function `admin-convidar-usuario` possui `SUPABASE_ANON_KEY`.
- [ ] Edge Function `admin-convidar-usuario` possui `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] Edge Function `admin-convidar-usuario` possui `WEB_APP_URL` apontando para o dominio oficial.

## Dominio e Auth

- [ ] Dominio do painel web configurado.
- [ ] URLs de redirect do Supabase Auth incluem o dominio oficial.
- [ ] URLs de redirect do Supabase Auth incluem ambiente de preview/local quando necessario.
- [ ] Convite de usuario abre diretamente a tela de login correta.
- [ ] Sessao expirada redireciona para login sem perder dados do coletor.

## Banco de dados

- [ ] Nenhuma mudanca usa `drop table`, `truncate`, reset remoto ou recriacao do banco.
- [ ] Toda mudanca nova esta em `supabase/migrations`.
- [ ] Migration foi criada com `npx supabase migration new`.
- [ ] Migration e idempotente quando possivel.
- [ ] Backfills preservam valores existentes.
- [ ] Constraints novas foram validadas contra dados existentes.
- [ ] Todas as tabelas expostas possuem RLS habilitada.
- [ ] Views expostas usam `security_invoker = true` ou grants restritos.

## Seguranca

- [ ] Nenhum `service_role` aparece em frontend, app mobile ou variavel `VITE_*`.
- [x] RPCs criticas/legadas auditadas na Fase 0 possuem `set search_path` quando usam `SECURITY DEFINER`.
- [x] RPCs administrativas revogam `public` e `anon`.
- [ ] RPCs anon validam segredo de dispositivo internamente.
- [ ] Dispositivos sao revogados por status, sem apagar historico.
- [ ] Politicas de Storage restringem acesso por bucket e caminho da empresa.
- [ ] `device_secret` do coletor usa Secure Storage em vez de `localStorage`.

## Backup e recuperacao

- [ ] Backup automatico do Supabase esta habilitado conforme plano contratado.
- [ ] Existe rotina de exportacao periodica dos dados criticos.
- [ ] Existe contato/credencial de emergencia documentado fora do codigo.
- [ ] Antes de migration sensivel, foi feito backup ou snapshot.

## Monitoramento

- [ ] Logs da Edge Function sao revisados em fluxo de convite.
- [ ] Erros do painel web sao capturados em ferramenta de monitoramento.
- [ ] Falhas de sincronizacao do coletor aparecem para o usuario.
- [ ] Ultimo sync de dispositivos e acompanhado no painel.
- [ ] Alertas operacionais sao revisados em demo e em producao.

## App Android

- [ ] APK release assinado com keystore oficial.
- [ ] `versionCode` aumenta a cada release.
- [ ] `APP_VERSION` do coletor corresponde ao APK publicado.
- [ ] `app_versions` no Supabase aponta para a versao correta.
- [ ] Atualizacao obrigatoria foi testada em aparelho real.
- [ ] Plano de Secure Storage esta priorizado antes de escala comercial ampla.
- [x] `npm run lint` do coletor finaliza sem varrer artefatos Android gerados.

## Comercial

- [ ] Empresa demo criada com dados realistas.
- [ ] Usuario demo admin validado.
- [ ] Fazenda, retiro, lote, cochos e dispositivos demo criados.
- [ ] QR Codes impressos e testados com coletor.
- [ ] Relatorio de abastecimentos exportado em Excel, CSV e impressao.
- [ ] Roteiro de demo com inicio, coleta offline, sync e dashboard preparado.
