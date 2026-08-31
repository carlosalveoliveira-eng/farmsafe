# FarmSafe Commercial Readiness Audit

Data: 2026-08-30

Escopo: auditoria de primeira fase, sem alteracao de codigo de produto, sem migrations, sem alteracao de dados e sem escrita no Supabase remoto.

Projeto Supabase remoto consultado em leitura: `farmsafe-main` (`arqkclxwxjvgkkzopjxa`).

## 1. Executive Summary

O FarmSafe ja tem uma base funcional forte para virar SaaS agropecuario: painel web, coletor offline, QR Code, abastecimentos, estoque por movimentacao, dispositivos, usuarios, mapas KMZ/KML/GeoJSON, Storage e RPCs principais. A direcao tecnica esta correta, especialmente por ja existir RLS, isolamento por `empresa_id`, idempotencia por `client_uuid` e movimentacoes historicas de estoque.

Ainda nao recomendo comercializacao ampla antes de fechar a Fase 0. Os bloqueios principais sao: hardening das RPCs legadas expostas, autorizacao fina por papel, Secure Storage no coletor, testes de RLS/RPC/offline, governanca de migrations e observabilidade. O sistema pode seguir em pilotos controlados, com backups e checklist operacional, mas nao deve escalar clientes pagantes sem estes pontos.

Classificacao geral: parcialmente pronto para piloto comercial assistido; nao pronto para comercializacao ampla.

## 2. Arquitetura Atual

Repositorios/modulos observados:

- `apps/web`: painel administrativo/gestao em React 18, Vite 5, Supabase JS, Leaflet, Recharts, XLSX.
- `apps/coletor`: app coletor em React 19, Vite 8, Capacitor 8, Dexie/IndexedDB, ZXing, PWA.
- `supabase`: migrations recentes, Edge Function `admin-convidar-usuario`, SQL historico.
- `database/migrations`: migrations antigas fora do fluxo padrao Supabase CLI.
- `landing`: site estatico com assets de divulgacao/download.
- `docs`: politicas e checklists iniciais.

Fluxo macro:

```text
Painel Web
  -> Supabase Auth
  -> Schema farmsafe via Data API/RPC
  -> Storage maps/documentos-fiscais

Coletor Android/PWA
  -> device_secret local
  -> carga offline de cochos/insumos
  -> Dexie/IndexedDB
  -> registrar_abastecimento_coletor
  -> abastecimentos + estoque_movimentacoes
```

## 3. Arquitetura Recomendada

Evoluir sem reescrever tudo:

```text
UI
  paginas, componentes, formularios
Application
  casos de uso: registrar abastecimento, mover lote, importar mapa, processar NF-e
Domain
  regras: estoque, multi-tenancy, roles, sync, dispositivos
Infrastructure
  Supabase, Storage, Dexie, APIs externas, Leaflet/GeoJSON
```

Prioridade: centralizar regras criticas em services/RPCs transacionais e manter componentes focados em interacao. Evitar grande refatoracao cosmetica.

## 4. Estado do Banco

Tabelas remotas confirmadas com RLS habilitado no schema `farmsafe`:

- `abastecimentos`, `app_versions`, `cochos`, `cotacoes_mercado`, `dispositivos`, `documentos_fiscais`, `documentos_fiscais_itens`, `documentos_fiscais_pagamentos`, `empresa_documentos_fiscais`, `empresas`, `estoque_movimentacoes`, `fazendas`, `insumos`, `logs_operacionais`, `lote_map_movimentacoes`, `lotes`, `map_areas`, `maps`, `retiros`, `usuarios`.

View:

- `vw_status_cochos` existe e esta com `security_invoker=on`, bom para respeitar RLS das tabelas base.

Indices relevantes:

- `abastecimentos_empresa_client_uuid_uniq`: protege idempotencia por empresa.
- `idx_dispositivos_secret`: busca por `device_secret`.
- `idx_maps_empresa_fazenda_ativo` e `idx_map_areas_empresa_fazenda_map`: suportam mapa operacional.
- Existem indices redundantes, como dois unicos para `cochos.codigo_qr` e multiplos indices parecidos para `abastecimentos` por data/empresa. Isso e P3/P4 por custo de escrita, nao bloqueio.

## 5. Estado do Supabase

Achados:

- CLI disponivel via `npx supabase`, versao observada: `2.116.0`.
- Projeto remoto linkado: `arqkclxwxjvgkkzopjxa`.
- `supabase/config.toml` nao existe no repositorio. Isso prejudica fluxo local padrao, diff, testes e onboarding tecnico.
- `supabase migration list` falhou por erro local de telemetry/EPERM em `C:\Users\Carlo\.supabase\telemetry.json`, nao por erro de banco. Verificacao de historico ficou inconclusiva.
- Existem migrations em `database/migrations` e `supabase/migrations`, indicando governanca ainda dividida.

## 6. Seguranca

Pontos bons:

- Frontend/coletor usam anon/publishable key; nao encontrei `service_role` nos clientes.
- Edge Function de convite valida JWT com `getUser()` e perfil ativo antes de usar `service_role`.
- RLS ligado nas tabelas principais.
- View operacional usa `security_invoker`.
- RPC nova `mover_lote_mapa` esta `SECURITY INVOKER`.

Riscos:

- Varias RPCs `SECURITY DEFINER` seguem expostas a `anon`/`authenticated`, algumas legadas.
- `ativar_dispositivo`, `sync_abastecimento` e `get_dados_sincronizacao` aparecem com grant publico/anon e algumas sem `search_path`.
- `device_secret` no coletor fica em `localStorage`.
- Autorizacao por papel ainda nao esta aplicada uniformemente no banco para operacoes como estoque, cochos, mapas e fazendas.
- Storage de mapas permite DELETE para `authenticated` dentro da empresa/fazenda. Pode ser funcional, mas precisa politica de retencao e versionamento.

Referencias usadas:

- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Storage access control: https://supabase.com/docs/guides/storage/security/access-control
- Supabase API security: https://supabase.com/docs/guides/api/securing-your-api
- OWASP ASVS: https://owasp.org/www-project-application-security-verification-standard/

## 7. Multi-Tenancy

Modelo atual dominante: isolamento por `empresa_id`.

Tabela | SELECT | INSERT | UPDATE | DELETE | Role | Isolamento
--- | --- | --- | --- | --- | --- | ---
`abastecimentos` | sim | sim | sim | nao observado | authenticated | `empresa_id = get_empresa_id()`
`cochos` | sim | sim | sim | nao observado | authenticated | `empresa_id = get_empresa_id()`
`dispositivos` | sim | sim | sim | nao observado | authenticated | `empresa_id = get_empresa_id()`
`estoque_movimentacoes` | sim | sim | sim | nao observado | authenticated | `empresa_id = get_empresa_id()`
`fazendas` | sim | sim | sim | nao observado | authenticated | `empresa_id = get_empresa_id()`
`insumos` | sim | sim | sim | nao observado | authenticated | `empresa_id = get_empresa_id()`
`lotes` | sim | sim | sim | nao observado | authenticated | `empresa_id = get_empresa_id()`
`maps` | sim | sim | sim | nao observado | authenticated | `empresa_id = get_empresa_id()`
`map_areas` | sim | sim | sim | nao observado | authenticated | `empresa_id = get_empresa_id()`
`usuarios` | sim | nao observado | nao observado via table | nao observado | authenticated | proprio usuario ativo ou gestor da empresa

Cenarios conceituais:

- Usuario Empresa A consulta Empresa A: permitido.
- Usuario Empresa A consulta Empresa B: deve ser bloqueado por RLS.
- Usuario Empresa A altera dado de Empresa B: deve ser bloqueado por `WITH CHECK`.
- Usuario operador/visualizador altera estoque da propria empresa: risco atual, pois RLS diferencia empresa, nao papel.
- Dispositivo Empresa A envia abastecimento em cocho de Empresa B: RPC critica valida device, fazenda e QR do dispositivo; deve bloquear.

Conclusao: multi-tenancy por empresa esta bem encaminhado; autorizacao por papel/fazenda ainda precisa amadurecer.

## 8. Auth

Implementado:

- Login via Supabase Auth.
- `PrivateRoute` valida sessao e perfil ativo por `getEmpresaUsuario`.
- Setup inicial por RPC `criar_setup_empresa_inicial`.
- Convite por Edge Function com `service_role` server-side.

Parcial:

- Ciclo de troca de senha, sessao expirada e redirect existe em parte, mas nao ha matriz completa.
- Papel existe (`dono`, `admin_empresa`, `gerente`, `controller`, `escritorio`), mas enforcement fino ainda e parcial.

Ausente/pendente:

- Desativacao vs remocao formal.
- Transferencia de responsabilidade.
- Retencao historica documentada e aplicada.
- Testes de acesso por papel.

## 9. Usuarios

Fluxo atual:

```text
Usuario autentica
  -> busca farmsafe.usuarios por auth_user_id
  -> carrega empresa
  -> se nao houver perfil ativo, redireciona setup
```

Convite:

```text
Gestor autenticado
  -> Edge Function admin-convidar-usuario
  -> valida role do gestor
  -> inviteUserByEmail
  -> cria farmsafe.usuarios
```

Matriz recomendada:

Perfil | Pode gerir empresa | Pode gerir usuarios | Pode gerir fazendas | Pode operar estoque | Pode usar mapa | Pode ver relatorios
--- | --- | --- | --- | --- | --- | ---
dono | sim | sim | sim | sim | sim | sim
admin_empresa | parcial | sim, abaixo dele | sim | sim | sim | sim
gerente | nao | limitado | sim | sim | sim | sim
controller | nao | nao | nao/pouco | sim, com restricao | leitura | sim
escritorio | nao | nao | nao | fiscal/relatorios | leitura | sim
operador/tratador futuro | nao | nao | nao | somente coleta | leitura limitada | nao/parcial
visualizador futuro | nao | nao | nao | nao | leitura | sim

## 10. Dispositivos

Implementado:

- `device_secret`.
- Ativacao.
- Carga offline.
- Revogacao e reativacao por RPC administrativa.
- `ultimo_sync`.
- Verificacao de app version.

Riscos:

- Segredo em `localStorage` no coletor.
- Rotacao de credenciais ainda nao fechada.
- Reativacao precisa definir se reutiliza segredo ou gera novo.
- Sem prova local de protecao contra replay alem da idempotencia por `client_uuid`.

Recomendacao:

- Migrar segredo para Secure Storage/Keychain via plugin Capacitor.
- Adicionar `device_secret_hash`, `rotated_at`, `last_seen_app_version`, `last_seen_platform`, `last_seen_ip` quando apropriado.
- Manter segredo antigo aceito por janela curta na rotacao.

## 11. Coletor

Fluxo atual:

```text
Ativacao
  -> salva device_secret
  -> baixa carga de cochos/insumos
  -> operador escaneia QR
  -> seleciona insumo e quantidade
  -> captura GPS
  -> grava abastecimento local Dexie
  -> auto/manual sync
  -> RPC registrar_abastecimento_coletor
  -> marca sincronizado/duplicado/erro
```

Pontos bons:

- Offline-first real com Dexie.
- `client_uuid` por registro.
- Estados locais `pendente`, `sincronizando`, `sincronizado`, `sincronizado_com_alerta`, `duplicado`, `erro`.
- Preserva pendencias em falha.

Riscos:

- `limparFilaLocal()` apaga todos os abastecimentos locais. Precisa protecao de UI/permissao/confirmacao dupla e, idealmente, impedir apagar pendentes.
- Sem backoff persistente claro.
- Sem estado separado para erro permanente vs retry automatico.
- GPS ausente nao bloqueia, o que pode ser aceitavel, mas precisa politica por cliente.

## 12. Offline/Sync

Maquina de estados recomendada:

```text
PENDENTE
  -> ENVIANDO
  -> SINCRONIZADO

PENDENTE
  -> ENVIANDO
  -> ERRO_RETRY
  -> PENDENTE

PENDENTE
  -> ENVIANDO
  -> ERRO_BLOQUEANTE

PENDENTE
  -> ENVIANDO
  -> DUPLICADO_CONFIRMADO
```

Regras:

- `sincronizando` nao deve ficar permanente apos crash; ao abrir app, converter para `pendente` com contador.
- Erros de autorizacao devem pausar sync e preservar fila.
- Falhas de rede devem usar backoff com proxima tentativa.
- `client_uuid` deve ser unico localmente e no banco.

## 13. Estoque

Implementado:

- `insumos`.
- `estoque_movimentacoes`.
- Tipos: saldo inicial, entrada, saida, consumo, ajustes, transferencias.
- Consumo gerado por abastecimento do coletor.
- NF-e importada e processada para estoque.

Problema:

- O frontend ainda consegue criar movimentacoes diretamente pela Data API com RLS por empresa. Para produto comercial, movimentacao de estoque deveria ser comandada por caso de uso/RPC, com validacao, auditoria, idempotencia e bloqueio de edicao historica.

Recomendacao:

- Manter historico imutavel ou quase imutavel.
- Correcoes devem ser ajustes compensatorios, nao update de linhas antigas.
- Exigir motivo em ajuste.
- Separar estoque central, fazenda, retiro/pasto e reservatorio local quando o processo real pedir.

## 14. Mapas

Implementado:

- `farmsafe.maps` com KMZ/KML/GeoJSON.
- `farmsafe.map_areas`.
- Upload opcional na tela de fazenda.
- Mapa operacional com pastos, cochos, lotes, rota, movimentacao de lote e subdivisao parcial.

Pontos de atencao:

- Sem PostGIS ainda; GeoJSON em JSONB e calculos no frontend sao suficientes para MVP, mas podem ficar caros com muitas areas.
- `maps_storage_delete` permite apagar arquivo. Preferir versionamento/inativacao em produto comercial.
- Edicao geoespacial operacional precisa trilha de auditoria completa.

Quando considerar PostGIS:

- Busca espacial por milhares de cochos/poligonos.
- Validacao server-side de ponto dentro de pasto.
- Relatorios por area/raio.
- Tiles vetoriais ou simplificacao geoespacial.

## 15. Dashboard

Ja existem dados para indicadores operacionais:

- abastecimentos por periodo;
- cochos sem registro;
- atrasos;
- consumo total por insumo;
- consumo por lote/cocho/fazenda;
- estoque atual por movimentacoes;
- status de sync por dispositivo.

Nao inventar indicadores como consumo por animal sem garantir quantidade historica por lote e periodo.

## 16. Dados e Analytics

Metricas recomendadas:

- Operacionais: pendencias sync, cochos atrasados, ultimo abastecimento, estoque abaixo do minimo.
- Taticas: consumo por fazenda/retiro/lote, rota de abastecimento, frequencia por tratador.
- Gerenciais: custo por kg, estoque projetado, divergencias de NF-e/estoque, produtividade.
- Estrategicas: tendencia de consumo, sazonalidade, previsao de compra, risco de ruptura.

## 17. IA

Ideias com valor real:

1. Anomalia de consumo
   - Dados: historico por cocho/lote/insumo/clima.
   - MVP: regras estatisticas simples antes de ML.
   - Risco: falso positivo por manejo real nao registrado.

2. Previsao de reposicao
   - Dados: saldo, consumo medio, lead time de compra.
   - MVP: forecast simples por media movel.
   - Beneficio: evitar ruptura.

3. Assistente de relatorios
   - Dados: relatorios estruturados.
   - MVP: sumarizacao mensal para gestor.
   - Risco: alucinacao; exigir fontes e numeros auditaveis.

4. Consulta em linguagem natural
   - Dados: camada semantica segura.
   - MVP futuro; depende de RBAC forte.

## 18. APIs Externas

API | URL | Auth/Custo | Utilidade | Recomendacao
--- | --- | --- | --- | ---
Open-Meteo | https://open-meteo.com/en/docs | sem chave para uso nao comercial; comercial requer contato/licenca | clima, chuva, evapotranspiracao, previsao operacional | bom MVP para clima, validar termos comerciais
INMET/WIS2 | https://wis2bra.inmet.gov.br/oapi/openapi?f=html | fonte oficial; consultar limites | estacoes meteorologicas oficiais | usar para historico/validacao regional quando houver cobertura
IBGE Localidades/Malhas/Agregados | https://servicodados.ibge.gov.br/api/docs | publico | normalizar municipio/UF, malhas, contexto territorial | usar para cadastro e enriquecimento geografico
BrasilAPI | https://brasilapi.com.br/docs | publico/beta/MIT; evitar abuso | CEP, CNPJ, NCM | util para cadastro/NF-e, com fallback e cache
MapBiomas Alerta | https://plataforma.alerta.mapbiomas.org/api/docs/index.html | exige conta/token | alertas ambientais e territorios | futuro; alto valor para fazendas com governanca ambiental
MapBiomas Agua/territorios | https://plataforma.agua.mapbiomas.org/api/docs/ | autenticado/contextual | agua, camadas territoriais, CAR em alguns endpoints | futuro, avaliar licenca e caso de uso

API ja existente no codigo:

- `https://agrodocai.com.br/api/v1/cotacao`: precisa documentacao oficial, SLA, termos e fallback. Manter como opcional/manual ate validar fonte.

## 19. Performance

Verificacoes:

- `apps/web`: lint passou; build passou; bundle JS principal ~1.56 MB, gzip ~459 KB, alerta Vite.
- `apps/coletor`: build passou; bundle JS principal ~1.00 MB, gzip ~278 KB, alerta Vite/Rolldown.
- `apps/coletor`: lint nao finalizou em tempo razoavel nesta auditoria; precisa investigar.

Gargalos provaveis:

- Falta de code splitting por rotas.
- Leaflet, XLSX, Recharts e KMZ/GeoJSON no bundle inicial.
- Relatorios/listagens sem paginacao robusta para alto volume.
- Mapa com GeoJSON grande renderizado no cliente.

## 20. Testes

Funcionalidade | Teste necessario | Prioridade
--- | --- | ---
RLS por empresa | positivo/negativo com duas empresas | P0
RPC `registrar_abastecimento_coletor` | contrato, duplicidade, dispositivo revogado | P0
Auth/setup | login, setup inicial, usuario sem empresa | P0
Convite | roles permitidas/proibidas | P1
Coletor offline | salvar sem rede, reiniciar, sincronizar | P0
Estoque | consumo, entrada, ajuste, NF-e duplicada | P1
Storage maps/documentos | acesso cruzado e path traversal | P1
Mapa operacional | mover lote total/parcial, cocho em pasto | P2
Build mobile | Android release assinado | P1
E2E web | fluxos comerciais basicos | P2

## 21. Observabilidade

Definicoes:

- Log tecnico: erro de app, stack, latencia, falha de API.
- Auditoria: quem fez o que, quando, antes/depois, IP/dispositivo quando cabivel.
- Log operacional: evento de fazenda, abastecimento, estoque, mapa, sync.

Pendencias:

- Captura centralizada de erros web/mobile.
- Painel de falhas de sync.
- Alertas de Edge Function.
- Auditoria de alteracoes de estoque/mapa/usuario.

## 22. UX

Gestor/admin:

- Painel ja cobre dominios principais.
- Layout foi compactado recentemente, mas ainda precisa padrao consistente de formularios, erros e confirmacoes.

Tratador/coletor:

- Fluxo simples e adequado: scan, confirma, salva.
- Precisa telas de erro mais orientadas para campo: sem internet, GPS impreciso, dispositivo revogado, carga velha.

Mapa:

- Evoluiu para operacional.
- Precisa reduzir sobrecarga visual por padrao e reforcar auditoria/undo em acoes criticas.

## 23. Mobile

Implementado:

- Capacitor Android.
- PWA.
- Dexie local.
- Atualizacao obrigatoria por `app_versions`.

Pendencias:

- Keystore/release checklist.
- Secure Storage.
- Politica de versao minima.
- Teste em aparelho real sem rede.
- Plano de migracao de `localStorage` para storage seguro.

## 24. Deploy

Observado:

- `apps/web/vercel.json`, `apps/coletor/vercel.json`, `landing/vercel.json`.
- Env files locais existem (`apps/web/.env.local`, `apps/coletor/.env`), valores nao foram expostos no relatorio.

Pendencias:

- Dominios finais.
- Redirect URLs Supabase Auth.
- Backups/snapshots.
- Monitoramento.
- CI com lint/build/test.
- Supabase config padrao.

## 25. Riscos

P0:

- RPCs legadas `SECURITY DEFINER` expostas a `anon`/`PUBLIC` (`sync_abastecimento`, `get_dados_sincronizacao`, `ativar_dispositivo`) sem hardening completo documentado.
- Ausencia de testes automatizados de RLS/RPC/multi-tenancy antes de comercializacao.
- `device_secret` em `localStorage` para app Android/coletor.

P1:

- Autorizacao por papel incompleta no banco para operacoes de escrita.
- Governanca de migrations dividida entre `database/migrations` e `supabase/migrations`, sem `supabase/config.toml`.
- Lint do coletor nao finalizou nesta auditoria.
- Storage de mapas com DELETE sem politica clara de retencao.
- Writes diretos de estoque pelo frontend.

P2:

- Bundle grande nos dois apps.
- Falta de paginacao/cache robusta em listagens e relatorios.
- Observabilidade insuficiente.
- Mapa sem validacao espacial server-side.
- API de cotacao sem SLA/documentacao versionada.

P3:

- Indices redundantes.
- Diferenca grande de versoes entre web e coletor.
- Inconsistencia de encoding em alguns arquivos/textos exibidos no terminal.

P4:

- IA avancada, tiles vetoriais, PostGIS amplo, assistente em linguagem natural.

## 26. Divida Tecnica

- `supabase/farmsafe-functions.sql` historico/legado divergente do contrato atual.
- Migracoes antigas fora de `supabase/migrations`.
- Componentes de paginas grandes com regras de negocio misturadas.
- Tipos TypeScript manuais espelhando banco; ideal gerar tipos Supabase.
- Services ainda variam entre Data API direta e RPC.

## 27. Roadmap

### FASE 0 - Seguranca e integridade

Objetivo: remover bloqueios de comercializacao.

Tarefas:

- Hardening ou despublicacao das RPCs legadas.
- Criar testes RLS/RPC.
- Migrar `device_secret` para Secure Storage.
- Definir matriz de roles e aplicar nas RPCs/policies.
- Normalizar Supabase CLI/config/migrations.

Aceite:

- Usuario Empresa A nao acessa B em testes automatizados.
- Dispositivo revogado nao sincroniza.
- Retry duplicado nao cria abastecimento duplicado.
- Nenhuma funcao critica `SECURITY DEFINER` exposta sem justificativa.

### FASE 1 - Core comercial

- Onboarding completo.
- Usuarios/convites/papeis.
- Relatorios basicos.
- Backup e monitoramento.
- Ambiente demo.

### FASE 2 - Operacao rural

- Offline robusto com backoff.
- Tela de falhas de sync.
- Atualizacao obrigatoria testada.
- UX de campo.

### FASE 3 - Mapa

- Auditoria de acoes no mapa.
- Melhor edicao de areas/cochos.
- Validacao espacial server-side ou PostGIS incremental.

### FASE 4 - Estoque e consumo

- RPCs transacionais de estoque.
- Ajuste com motivo.
- Estoque por local.
- Projecao simples.

### FASE 5 - Inteligencia

- Alertas de anomalia por regras.
- Previsao de reposicao simples.
- Sumarizacao de relatorios.

### FASE 6 - Escala

- Code splitting.
- Paginacao.
- Observabilidade completa.
- Multi-ambiente e CI/CD.

## 28. Criterios de Comercializacao

SEGURANCA: nao aprovado ate hardening P0.

MULTI-TENANCY: parcialmente aprovado; precisa testes automatizados.

AUTH: parcialmente aprovado; falta ciclo completo.

USUARIOS: parcialmente aprovado.

DISPOSITIVOS: parcialmente aprovado; Secure Storage bloqueia escala.

OFFLINE: parcialmente aprovado.

SYNC: bom desenho; precisa testes de conflito/retry.

BANCO: bom desenho; governanca pendente.

RLS: habilitado; precisa teste e role-based refinado.

RPC: funcional; hardening legado pendente.

ESTOQUE: bom modelo; writes precisam transacao/auditoria.

MAPA: MVP operacional; ainda em evolucao.

DASHBOARD: basico aprovado para piloto.

RELATORIOS: basico aprovado para piloto.

OBSERVABILIDADE: nao aprovado.

PERFORMANCE: aprovado para piloto; nao para escala.

TESTES: nao aprovado.

DEPLOY: parcialmente aprovado.

BACKUP: precisa confirmacao operacional.

RECUPERACAO: precisa plano.

DOCUMENTACAO: melhorando; estes docs iniciam baseline.

UX: aprovado para piloto assistido.

MOBILE: parcialmente aprovado; Secure Storage e release real pendentes.

## Problemas Criticos Detalhados

### P0 - RPCs legadas expostas

PROBLEMA: funcoes antigas `SECURITY DEFINER` aparecem com grant para `anon`/`PUBLIC`.

CAUSA: historico de evolucao do banco e compatibilidade legada.

IMPACTO: superficie de ataque maior; possivel bypass de RLS se validacoes internas forem insuficientes.

RISCO: vazamento ou escrita indevida entre tenants/dispositivos.

CORRECAO: auditar corpo de cada funcao, revogar `PUBLIC`, manter apenas roles necessarias, adicionar `search_path`, remover RPC legada se sem uso ou manter wrapper seguro.

COMO VALIDAR: testes anon/authenticated para chamadas permitidas/proibidas e teste negativo com device_secret invalido/revogado.

### P0 - Segredo de dispositivo em localStorage

PROBLEMA: `device_secret` fica em `localStorage`.

CAUSA: implementacao web/PWA simples.

IMPACTO: maior risco se WebView/app/dispositivo for comprometido.

RISCO: clonagem de dispositivo e envio indevido.

CORRECAO: Secure Storage nativo no Capacitor, hash server-side, rotacao e revogacao.

COMO VALIDAR: teste em Android real, uninstall/reinstall, revogacao, rotacao e sync bloqueado com segredo antigo.

### P0 - Falta de testes de acesso

PROBLEMA: nao ha suite automatizada garantindo isolamento multi-tenant/RLS/RPC.

CAUSA: fase atual focada em funcionalidade.

IMPACTO: regressao de seguranca pode entrar sem alerta.

RISCO: vender SaaS multiempresa sem prova objetiva de isolamento.

CORRECAO: criar testes SQL/RLS, testes de RPC e E2E minimo.

COMO VALIDAR: CI executa testes antes de merge/deploy.

## Fase 0 - Implementacao Inicial

Data: 2026-08-30.

Status: parcialmente implementada. O hardening inicial das RPCs e a estabilizacao do lint do coletor foram aplicados. Ainda restam Secure Storage, testes multi-tenant com fixtures reais/isoladas e RBAC fino por papel.

### RPC Inventory

RPC | Quem chama | Role final | Security | Search path | Finalidade | Risco | Status
--- | --- | --- | --- | --- | --- | --- | ---
`_resolve_device(text)` | RPC legado interno | `postgres` | definer | `farmsafe, public` | resolver dispositivo por segredo | medio se exposta | necessaria interna
`admin_listar_usuarios()` | `UsuariosPage` | `authenticated` | definer | `farmsafe, public` | listar usuarios da empresa | alto se anon/public | necessaria
`admin_atualizar_usuario(...)` | `UsuariosPage` | `authenticated` | definer | `farmsafe, public` | atualizar perfil/role/status | alto se anon/public | necessaria
`admin_revogar_dispositivo(uuid,text)` | `DispositivosPage` | `authenticated` | definer | `farmsafe, public` | revogar dispositivo sem apagar historico | alto se anon/public | necessaria
`admin_reativar_dispositivo(uuid)` | `DispositivosPage` | `authenticated` | definer | `farmsafe, public` | reativar dispositivo | medio/alto | necessaria
`ativar_dispositivo(text)` | nao chamado pelo coletor atual | `anon` | definer | `farmsafe, public` | ativacao legada | medio | legada mantida
`coletor_obter_carga(text)` | `apps/coletor/src/services/carga.ts` | `anon` | definer | `farmsafe, public` | baixar carga offline | alto se validar mal segredo | necessaria
`coletor_verificar_atualizacao(text,text,text,int)` | `apps/coletor/src/services/atualizacao.ts` | `anon` | definer | `farmsafe, public` | versao minima/update | baixo/medio | necessaria
`criar_log_operacional(...)` | banco/RPC legado interno | `postgres` | definer | `farmsafe, public` | registrar log operacional | alto se publico | interna
`criar_setup_empresa_inicial(...)` | `SetupEmpresaPage` | `authenticated` | definer | `farmsafe, public` | primeiro setup | alto | necessaria
`gerar_codigo_cocho(uuid)` | `CochosPage` | default | invoker | vazio | gerar codigo | baixo/medio | necessaria
`gerar_codigo_fazenda()` | banco/cadastro | default | invoker | vazio | gerar codigo | baixo | necessaria
`get_dados_sincronizacao(text,timestamptz)` | nao chamado pelo coletor atual | `anon` | definer | `farmsafe, public` | delta legado | medio | legada mantida
`get_empresa_id()` | RLS/services | default | definer | `farmsafe, public` | resolver empresa do usuario | alto se errada | necessaria
`get_usuario_role()` | RPCs admin | default | definer | `farmsafe, public` | resolver role | alto se errada | necessaria
`listar_saldos_insumos()` | estoque web | `authenticated` | definer | `farmsafe, public` | saldo calculado | medio | necessaria
`mover_lote_mapa(...)` | mapa operacional | `authenticated` | invoker | `farmsafe, public` | mover/subdividir lote | medio | necessaria
`processar_documento_fiscal_estoque(...)` | fiscal web | `authenticated` | definer | `farmsafe, public` | gerar entrada estoque de NF-e | alto | necessaria
`registrar_abastecimento_coletor(...)` | `apps/coletor/src/services/sync.ts` | `anon` | definer | `farmsafe, public` | sync do coletor | alto | necessaria
`set_updated_at()` | triggers | default | invoker | vazio | timestamp | baixo | necessaria
`sync_abastecimento(...)` | nao chamado pelo coletor atual | `anon` | definer | `farmsafe, public` | sync legado | alto | legada mantida
`usuario_tem_role(text[])` | RLS/RPCs | default | definer | `farmsafe, public` | checar role | alto se errada | necessaria

### Migrations Aplicadas

- `supabase/migrations/20260831024158_phase0_rpc_hardening.sql`
  - adiciona `search_path` explicito em RPCs legadas/privilegiadas;
  - remove execucao herdada de `PUBLIC`;
  - mantem RPCs de coletor com `anon` quando o dispositivo valida `device_secret` internamente;
  - mantem RPCs administrativas apenas para `authenticated`;
  - fecha `criar_log_operacional` para chamada direta por clientes.

### Testes/Checks Criados

- `supabase/tests/phase0_security_checks.sql`
  - verifica RLS em tabelas do schema `farmsafe`;
  - verifica `vw_status_cochos` com `security_invoker`;
  - verifica contrato da RPC `registrar_abastecimento_coletor`;
  - verifica indice de idempotencia `abastecimentos_empresa_client_uuid_uniq`;
  - verifica RPCs admin sem grant para `anon`;
  - verifica helper de log sem chamada publica.

Resultado remoto em 2026-08-30: todos os checks retornaram `PASS`.

### QA

- `apps/web npm run lint`: passou.
- `apps/web npm run build`: passou com aviso de bundle grande.
- `apps/coletor npm run lint`: passou apos restringir lint a codigo fonte relevante.
- `apps/coletor npm run build`: passou com aviso de bundle grande.

### Pendencias da Fase 0

- Secure Storage para `device_secret`.
- Testes multi-tenant com usuarios/empresas de teste fora do banco de producao.
- Testes negativos reais de dispositivo revogado e segredo invalido.
- RBAC fino por papel em policies/RPCs para escritas sensiveis.
- Plano de aposentadoria das RPCs legadas `sync_abastecimento`, `get_dados_sincronizacao` e `ativar_dispositivo`.
