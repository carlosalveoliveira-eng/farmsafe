import { supabase } from './supabase'

export type SetupEmpresaInput = {
  empresaNome: string
  usuarioNome: string
  fazendaNome?: string | null
  fazendaCidade?: string | null
  fazendaEstado?: string | null
}

export type SetupEmpresaResult = {
  ok: boolean
  codigo?: string
  erro?: string
  mensagem?: string
  empresa_id?: string
  usuario_id?: string
  fazenda_id?: string | null
}

function textoOuNull(value?: string | null) {
  const texto = value?.trim()
  return texto ? texto : null
}

export async function criarSetupEmpresaInicial(
  input: SetupEmpresaInput
): Promise<SetupEmpresaResult> {
  const empresaNome = input.empresaNome.trim()
  const usuarioNome = input.usuarioNome.trim()

  if (!empresaNome) {
    throw new Error('Informe o nome da empresa.')
  }

  if (!usuarioNome) {
    throw new Error('Informe o nome do responsavel.')
  }

  const { data, error } = await supabase.rpc('criar_setup_empresa_inicial', {
    p_empresa_nome: empresaNome,
    p_usuario_nome: usuarioNome,
    p_fazenda_nome: textoOuNull(input.fazendaNome),
    p_fazenda_cidade: textoOuNull(input.fazendaCidade),
    p_fazenda_estado: textoOuNull(input.fazendaEstado)?.toUpperCase() ?? null,
  })

  if (error) {
    throw new Error(`Erro ao criar setup inicial: ${error.message}`)
  }

  const result = data as SetupEmpresaResult

  if (!result?.ok) {
    throw new Error(result?.erro ?? 'Nao foi possivel concluir o setup.')
  }

  return result
}
