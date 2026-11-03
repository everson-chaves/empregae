import type { PostgrestError } from '@supabase/supabase-js'

// Tratamento de erro padronizado.
//
// Dois objetivos:
//
//   1. O usuário nunca lê "duplicate key value violates unique constraint
//      conversa_unica_por_par". Ele lê "Você já tem uma conversa com este
//      profissional".
//
//   2. As mensagens vêm das constraints que a T00.2 e a T00.4 criaram. Quando
//      o banco recusa alguma coisa, ele recusa por um motivo que tem nome — e
//      esse nome vira texto em português aqui, num lugar só.

export class ErroDeAplicacao extends Error {
  readonly causaTecnica?: unknown

  constructor(mensagem: string, causaTecnica?: unknown) {
    super(mensagem)
    this.name = 'ErroDeAplicacao'
    this.causaTecnica = causaTecnica
  }
}

// Constraints nomeadas → mensagem para o usuário.
// Ao criar constraint nova em migration, acrescente a mensagem dela aqui.
const POR_CONSTRAINT: Record<string, string> = {
  // Reputação (E06)
  reviews_booking_id_key: 'Esta contratação já foi avaliada.',
  reviews_nota_check: 'A nota precisa ser de 1 a 5.',

  // Conversas (E04)
  conversa_unica_por_par: 'Você já tem uma conversa com este profissional.',

  // Perfil (E02)
  profiles_telefone_key: 'Este telefone já está cadastrado em outra conta.',
  worker_profiles_profile_id_key: 'Você já tem um anúncio de profissional.',
  perfil_ativo_esta_completo:
    'Para ativar o anúncio, preencha descrição, preço e endereço.',

  // Contratação (E05)
  conclusao_coerente_com_status:
    'Não foi possível registrar a conclusão desta contratação.',

  // Verificação (E07)
  revisao_coerente_com_status: 'A revisão precisa registrar quando foi feita.',
  aprovado_tem_validade: 'Uma verificação aprovada precisa ter data de validade.',

  // Pagamentos
  pagamento_unico_no_provedor: 'Este pagamento já foi registrado.',
  periodo_valido: 'A data final precisa ser depois da inicial.',
}

// Códigos do Postgres e do PostgREST → mensagem para o usuário.
const POR_CODIGO: Record<string, string> = {
  '23505': 'Esse registro já existe.',
  '23503': 'Esse registro depende de outro que não foi encontrado.',
  '23514': 'Os dados enviados não são válidos.',
  '23502': 'Faltou preencher um campo obrigatório.',
  '22P02': 'Algum valor enviado está em formato inválido.',
  '42501': 'Você não tem permissão para fazer isso.',
  PGRST116: 'Registro não encontrado.',
  PGRST301: 'Sua sessão expirou. Entre novamente.',
}

function nomeDaConstraint(erro: PostgrestError): string | undefined {
  // O PostgREST devolve o nome da constraint no `message` ou no `details`,
  // dependendo do tipo de violação.
  const texto = `${erro.message ?? ''} ${erro.details ?? ''}`
  for (const nome of Object.keys(POR_CONSTRAINT)) {
    if (texto.includes(nome)) return nome
  }
  return undefined
}

/** Traduz um erro do Supabase para uma mensagem que faz sentido ao usuário. */
export function traduzirErro(erro: unknown): string {
  if (erro instanceof ErroDeAplicacao) return erro.message

  if (erro && typeof erro === 'object' && 'code' in erro) {
    const pgErro = erro as PostgrestError

    const constraint = nomeDaConstraint(pgErro)
    if (constraint) return POR_CONSTRAINT[constraint]

    const porCodigo = POR_CODIGO[String(pgErro.code)]
    if (porCodigo) return porCodigo
  }

  if (erro instanceof TypeError && erro.message.includes('fetch')) {
    return 'Não conseguimos conectar. Verifique sua internet e tente de novo.'
  }

  return 'Algo deu errado. Tente novamente em instantes.'
}

type Resposta<T> = { data: T | null; error: PostgrestError | null }

/**
 * Desembrulha uma resposta do Supabase, lançando erro já traduzido.
 *
 *   const perfil = desembrulhar(await supabase.from('profiles').select().single())
 */
export function desembrulhar<T>(resposta: Resposta<T>): T {
  if (resposta.error) {
    // O técnico fica no console para o dev; o usuário recebe o traduzido.
    console.error('[supabase]', resposta.error)
    throw new ErroDeAplicacao(traduzirErro(resposta.error), resposta.error)
  }
  if (resposta.data === null) {
    throw new ErroDeAplicacao('Registro não encontrado.')
  }
  return resposta.data
}

/**
 * Para UPDATE e DELETE, onde a RLS NÃO lança erro.
 *
 * Esta é a armadilha mais traiçoeira da camada de dados deste projeto: quando
 * a política de RLS barra um INSERT, o Postgres lança exceção. Quando ela
 * barra um UPDATE ou um DELETE, ela apenas **filtra as linhas** — a operação
 * retorna sucesso, com zero linhas afetadas.
 *
 * Sem esta verificação, o app mostra "verificação aprovada" para um usuário
 * que não tinha permissão nenhuma e cuja aprovação não aconteceu. Foi
 * exatamente o comportamento observado ao testar a T00.4.
 *
 * Use SEMPRE com `.select()` no fim da chamada, senão não há linha para contar:
 *
 *   exigirLinha(
 *     await supabase.from('verifications')
 *       .update({ status: 'aprovado' }).eq('id', id).select(),
 *     'Você não tem permissão para aprovar esta verificação.',
 *   )
 */
export function exigirLinha<T>(
  resposta: Resposta<T[]>,
  mensagemSeVazio = 'Você não tem permissão para alterar este registro, ou ele não existe mais.',
): T[] {
  const linhas = desembrulhar(resposta)
  if (linhas.length === 0) {
    throw new ErroDeAplicacao(mensagemSeVazio)
  }
  return linhas
}
