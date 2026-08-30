# FarmSafe Architecture

Data: 2026-08-30

## Diagrama Logico

```text
Usuarios Web
  -> apps/web
    -> Supabase Auth
    -> farmsafe schema
      -> empresas
      -> usuarios
      -> fazendas
      -> retiros
      -> lotes
      -> cochos
      -> abastecimentos
      -> estoque_movimentacoes
      -> mapas
      -> logs
    -> Supabase Storage
      -> maps
      -> documentos-fiscais
    -> Edge Functions
      -> admin-convidar-usuario

Tratador / Coletor
  -> apps/coletor Android/PWA
    -> localStorage device_secret
    -> Dexie/IndexedDB
      -> cochos
      -> insumos
      -> abastecimentos locais
      -> meta
    -> RPC coletor_obter_carga
    -> RPC registrar_abastecimento_coletor
    -> RPC coletor_verificar_atualizacao
```

## Modulos

Modulo | Local | Responsabilidade
--- | --- | ---
Painel web | `apps/web/src/pages` | gestao operacional, cadastros, relatorios, mapa
UI compartilhada | `apps/web/src/components` | layout, cards, tabelas, QR Code, mapa
Servicos web | `apps/web/src/services` | Supabase, auth, usuarios, estoque, fiscal, mapas, mercado
Mapa | `apps/web/src/features/mapa` e `services/map` | KMZ/KML, GeoJSON, areas, estilos, operacao espacial
Coletor | `apps/coletor/src` | app offline de campo
Offline | `apps/coletor/src/database/db.ts` | Dexie, fila local, carga offline
Sync | `apps/coletor/src/services/sync.ts` | envio de abastecimentos pendentes
Supabase SQL | `supabase/migrations`, `database/migrations` | schema, RPCs, RLS, Storage
Edge Function | `supabase/functions/admin-convidar-usuario` | convite seguro de usuarios
Landing | `landing` | site estatico comercial/download

## Dependencias

Web:

- React 18.
- Vite 5.
- Supabase JS 2.43.
- Leaflet/React Leaflet.
- XLSX.
- Recharts.

Coletor:

- React 19.
- Vite 8.
- Capacitor 8.
- Dexie 4.
- ZXing.
- Supabase JS 2.106.

Observacao: a diferenca de versoes entre web e coletor exige CI separado e testes de regressao. Nao e bloqueio isolado.

## Fluxo de Autenticacao

```text
Usuario abre web
  -> Supabase Auth getSession/getUser
  -> busca farmsafe.usuarios por auth_user_id
  -> exige ativo=true
  -> carrega empresa
  -> permite Layout privado
```

Setup:

```text
Usuario autenticado sem perfil ativo
  -> /setup
  -> RPC criar_setup_empresa_inicial
  -> cria empresa, usuario e opcionalmente fazenda
```

Convite:

```text
Gestor autorizado
  -> supabase.functions.invoke(admin-convidar-usuario)
  -> Edge valida JWT e role
  -> service_role cria convite Auth
  -> service_role cria farmsafe.usuarios
```

## Fluxo de Dados

```text
Cadastro web
  -> Data API / RPC
  -> RLS por empresa_id

Coleta campo
  -> Dexie
  -> RPC segura por device_secret
  -> abastecimentos
  -> estoque_movimentacoes
  -> dashboard/relatorios
```

## Fluxo Offline

```text
Ativar dispositivo
  -> salvar device_secret
  -> coletor_obter_carga
  -> cache local cochos/insumos

Sem internet
  -> scan QR
  -> valida cocho local
  -> salva abastecimento local pendente
```

## Fluxo de Sincronizacao

```text
Pendente local
  -> sincronizando
  -> RPC registrar_abastecimento_coletor
  -> ok: sincronizado
  -> ok duplicado: duplicado
  -> alerta estoque: sincronizado_com_alerta
  -> erro retry: erro
  -> erro autorizacao: bloqueia ciclo e preserva fila
```

Contrato RPC usado pelo coletor:

```text
registrar_abastecimento_coletor(
  p_device_secret,
  p_client_uuid,
  p_codigo_qr,
  p_insumo_id,
  p_quantidade_kg,
  p_observacao,
  p_status_cocho,
  p_leitura_cocho,
  p_latitude,
  p_longitude,
  p_gps_accuracy,
  p_registrado_em
)
```

## Fluxo de Autorizacao

Atual:

- RLS por `empresa_id = farmsafe.get_empresa_id()`.
- Usuarios: proprio usuario ativo ou gestores da empresa.
- Edge Function de convite aplica hierarquia de roles.
- RPCs administrativas devem validar role internamente.

Recomendado:

```text
Auth user
  -> usuarios.auth_user_id
  -> empresa_id
  -> role
  -> permissao por caso de uso
  -> RLS/RPC valida empresa + role + escopo
```

## Fluxo de Estoque

```text
Insumo
  -> entrada manual / NF-e / ajuste
  -> estoque_movimentacoes
  -> saldo calculado por soma

Abastecimento coletor
  -> consumo
  -> estoque_movimentacoes tipo=consumo
  -> saldo antes/depois
```

Regra recomendada: nao editar historico para corrigir estoque; lancar ajuste compensatorio com motivo.

## Fluxo de Mapas

```text
Fazenda
  -> upload opcional KMZ/KML
  -> conversao GeoJSON no frontend
  -> Storage maps/original e maps/processed
  -> farmsafe.maps ativo
  -> farmsafe.map_areas derivadas
  -> mapa operacional
    -> cochos com latitude/longitude/map_area_id
    -> lotes com map_area_id
    -> movimentacao total/parcial por RPC
```

## Arquitetura Recomendada por Camadas

```text
UI
  componentes e paginas
Application
  services/casos de uso
Domain
  estoque, sync, dispositivo, mapa, roles
Infrastructure
  Supabase, Dexie, Storage, APIs externas
```

Regra de evolucao: mover primeiro as regras criticas de seguranca/dados para Application/Domain/RPC; deixar layout/refatoracao visual para depois.
