// T01.2 — Telefone como identificador de login.
//
// Separado de auth.ts de propósito: normalizar/formatar telefone não é
// exclusivo de autenticação (perfil e chat também vão precisar). auth.ts
// importa daqui o que precisa para montar o e-mail sintético.

function apenasDigitos(entrada: string): string {
  return entrada.replace(/\D/g, '')
}

/**
 * Normaliza um telefone brasileiro para o formato salvo em
 * `profiles.telefone`: só dígitos, DDD + número, sem "+55", sem espaço, sem
 * traço — o mesmo que o check da migration `tabelas_base` exige
 * (`^[1-9][0-9]{9,10}$`).
 *
 * Aceita variações comuns de digitação: com ou sem código do país, com ou
 * sem parênteses/traço/espaço. Retorna `null` quando não dá para reconhecer
 * como um telefone brasileiro válido — quem chama decide a mensagem de erro.
 */
export function normalizarTelefone(entrada: string): string | null {
  let digitos = apenasDigitos(entrada)

  // "+55 11 91234-5678" ou "5511912345678" → tira o código do país da
  // frente. Só remove quando o tamanho bate com "55 + DDD + número", para
  // não confundir com um número local que por acaso começa em 55.
  if ((digitos.length === 12 || digitos.length === 13) && digitos.startsWith('55')) {
    digitos = digitos.slice(2)
  }

  // DDD (2) + fixo (8) = 10 dígitos, ou DDD (2) + celular com o 9 na frente
  // (9) = 11 dígitos. Fora disso não é um telefone brasileiro reconhecível.
  if (digitos.length !== 10 && digitos.length !== 11) return null

  // Mesmo regex da coluna profiles.telefone — não existe DDD começando em 0.
  if (!/^[1-9][0-9]{9,10}$/.test(digitos)) return null

  return digitos
}

/** Formata só para exibição: "11912345678" → "(11) 91234-5678". */
export function formatarTelefone(telefoneNormalizado: string): string {
  const ddd = telefoneNormalizado.slice(0, 2)
  const numero = telefoneNormalizado.slice(2)
  const tamanhoMeio = numero.length === 9 ? 5 : 4
  return `(${ddd}) ${numero.slice(0, tamanhoMeio)}-${numero.slice(tamanhoMeio)}`
}

/**
 * Heurística para o campo único de login (T01.2 — "permitir login pelos
 * dois caminhos"): sem "@" e com dígitos suficientes para ser um telefone,
 * trata como telefone; senão, trata como e-mail. Não valida — só decide
 * qual validação/transformação aplicar depois.
 */
export function pareceTelefone(entrada: string): boolean {
  if (entrada.includes('@')) return false
  return apenasDigitos(entrada).length >= 10
}
