# FarmSafe User Lifecycle

Data: 2026-08-30

## Objetivo

Definir ciclo de vida de usuarios sem apagar historico operacional. No FarmSafe, usuario removido nao significa apagar abastecimentos, estoque, logs ou auditoria.

## Estados Recomendados

Estado | Significado | Acesso | Historico
--- | --- | --- | ---
`convidado` | convite enviado, ainda nao ativado | nao ou limitado | manter convite/perfil
`ativo` | usuario com acesso normal | sim | manter
`suspenso` | bloqueio temporario | nao | manter
`desativado` | desligado da empresa | nao | manter
`transferido` | responsabilidade movida para outro usuario | depende novo vinculo | manter vinculos historicos
`removido_logico` | oculto da operacao diaria | nao | manter

## Cadastro / Setup

Fluxo atual:

```text
Usuario autentica no Supabase
  -> nao possui perfil ativo
  -> /setup
  -> cria empresa
  -> cria usuario dono/admin
  -> opcionalmente cria primeira fazenda
```

Regras:

- Setup deve ser idempotente por `auth_user_id`.
- Nao criar segunda empresa acidental para mesmo usuario sem confirmacao.
- O primeiro usuario vira responsavel inicial.

## Convite

Fluxo atual:

```text
Gestor autenticado
  -> informa nome, email, role
  -> Edge Function valida role do gestor
  -> Supabase Auth inviteUserByEmail
  -> cria farmsafe.usuarios
```

Regras recomendadas:

- `dono`: convida qualquer papel.
- `admin_empresa`: convida papeis abaixo dele.
- `gerente`: convida apenas operacionais/escritorio quando permitido.
- Outros: nao convidam.

Falha parcial:

- Se convite Auth foi criado e perfil falhou, pode apagar o usuario Auth recem-criado apenas porque ainda nao existe historico operacional.
- Nunca aplicar `deleteUser` como rotina para usuario ja ativo com historico.

## Ativacao

```text
Usuario recebe e-mail
  -> define senha/acessa login
  -> Supabase Auth valida
  -> perfil ativo permite entrada
```

Pendente:

- Tela de primeiro acesso com aceite de termos.
- Registro de aceite e versao dos termos.
- Atualizacao de dados pessoais.

## Login

Atual:

- Web usa Supabase Auth.
- `PrivateRoute` valida perfil ativo.

Recomendado:

- Sessao expirada deve voltar ao login.
- Usuario suspenso/desativado deve receber mensagem clara.
- MFA opcional para donos/admins futuramente.

## Permissoes

Roles atuais:

- `dono`
- `admin_empresa`
- `gerente`
- `controller`
- `escritorio`

Roles futuras possiveis:

- `operador`
- `tratador`
- `visualizador`

Matriz recomendada deve ser aplicada em:

- UI: mostrar/ocultar acoes.
- Services/RPCs: validar caso de uso.
- RLS: restringir linhas e operacoes.
- Edge Functions: proteger uso de service_role.

## Alteracao de Papel

Regras:

- Ninguem deve remover o ultimo `dono` ativo da empresa.
- Usuario nao pode elevar o proprio papel sem autorizacao superior.
- Mudanca de papel deve gerar auditoria.
- Papel antigo e novo devem ser registrados.

## Suspensao

Uso:

- Inadimplencia.
- Suspeita de comprometimento.
- Usuario temporariamente afastado.

Comportamento:

- Bloquear login/acoes novas.
- Manter historico.
- Dispositivos vinculados podem ser revogados conforme caso.

## Revogacao

Usuario:

- Revogar sessoes quando possivel.
- Marcar perfil como suspenso/desativado.
- Preservar `created_by`, abastecimentos e logs.

Dispositivo:

- Marcar `revogado_em`, `revogado_por`, `revogacao_motivo`.
- RPC de sync deve rejeitar imediatamente.
- Fila local permanece no aparelho, mas nao sincroniza ate regularizacao.

## Desligamento

Fluxo recomendado:

```text
Admin desativa usuario
  -> confirma transferencia de responsabilidades
  -> revoga sessoes
  -> registra auditoria
  -> usuario deixa de aparecer como ativo
  -> historico segue apontando para o usuario original
```

Nunca:

- Apagar abastecimentos.
- Apagar movimentacoes de estoque.
- Substituir usuario historico por outro.
- Apagar perfil se houver referencia historica.

## Retencao Historica

Manter:

- abastecimentos;
- estoque;
- logs operacionais;
- auditoria de usuarios;
- convites relevantes;
- mapas e alteracoes operacionais;
- documentos fiscais conforme obrigacao legal/contratual.

Excluir fisicamente apenas:

- usuario Auth recem-criado em convite falho, sem historico;
- dados pessoais sob politica LGPD, quando houver processo formal de anonimização e retencao legal preservada.

## Empresa Suspensa

Comportamento:

- Bloquear novas operacoes web.
- Coletor pode manter fila local, mas sync deve retornar erro claro se a empresa estiver suspensa.
- Relatorios podem ficar disponiveis em modo leitura conforme contrato.

## Empresa Encerrada

Comportamento:

- Congelar escrita.
- Exportar dados.
- Reter historico pelo prazo contratado/legal.
- Anonimizar dados pessoais quando aplicavel.
- Nao apagar automaticamente banco operacional.

## Criterios de Aceite

- Usuario desativado nao consegue login operacional.
- Usuario desativado continua aparecendo em historico.
- Ultimo dono nao pode ser desativado sem transferencia.
- Convite respeita hierarquia.
- Dispositivo revogado nao sincroniza.
- Empresa suspensa nao permite novas escritas.
- Todas as mudancas geram auditoria.
