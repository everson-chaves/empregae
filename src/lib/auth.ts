import { useEffect, useState } from 'react'
import type { AuthError, Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { ErroDeAplicacao } from './erros'
import { normalizarTelefone, pareceTelefone } from './telefone'

// T01.1 — Cadastro e login por e-mail e senha.
//
// Mesma ideia de erros.ts: o Supabase Auth (GoTrue) fala inglês técnico
// ("Invalid login credentials", "User already registered"). Este arquivo é o
// único lugar que sabe traduzir isso — ninguém deveria ler um AuthError cru
// em nenhuma tela.

// Códigos do GoTrue → mensagem em português, sem jargão técnico.
// Lista: https://supabase.com/docs/guides/auth/debugging/error-codes
const POR_CODIGO_AUTH: Record<string, string> = {
  invalid_credentials: 'E-mail ou senha incorretos.',
  user_already_exists: 'Este e-mail já está cadastrado. Tente entrar.',
  email_exists: 'Este e-mail já está cadastrado. Tente entrar.',
  user_not_found: 'Não encontramos uma conta com este e-mail.',
  weak_password: 'A senha precisa ter pelo menos 8 caracteres.',
  email_not_confirmed: 'Confirme seu e-mail antes de entrar — verifique sua caixa de entrada.',
  email_address_invalid: 'Digite um e-mail válido.',
  validation_failed: 'Confira os dados preenchidos.',
  over_request_rate_limit: 'Muitas tentativas seguidas. Aguarde um instante e tente de novo.',
  over_email_send_rate_limit: 'Aguarde um pouco antes de pedir outro e-mail.',
  same_password: 'A nova senha precisa ser diferente da atual.',
  session_expired: 'Sua sessão expirou. Entre novamente.',
  signup_disabled: 'Novos cadastros estão temporariamente desativados.',
}

// Fallback por texto da mensagem, para quando o erro não vem com `code`
// (acontece em algumas versões/transportes do cliente).
const POR_TRECHO_DA_MENSAGEM: Array<[string, string]> = [
  ['invalid login credentials', 'E-mail ou senha incorretos.'],
  ['already registered', 'Este e-mail já está cadastrado. Tente entrar.'],
  ['already exists', 'Este e-mail já está cadastrado. Tente entrar.'],
  ['password should be at least', 'A senha precisa ter pelo menos 8 caracteres.'],
  ['unable to validate email', 'Digite um e-mail válido.'],
  ['email not confirmed', 'Confirme seu e-mail antes de entrar — verifique sua caixa de entrada.'],
]

function traduzirErroAuth(erro: AuthError): string {
  const porCodigo = erro.code ? POR_CODIGO_AUTH[erro.code] : undefined
  if (porCodigo) return porCodigo

  const mensagem = erro.message?.toLowerCase() ?? ''
  for (const [trecho, traduzida] of POR_TRECHO_DA_MENSAGEM) {
    if (mensagem.includes(trecho)) return traduzida
  }

  if (mensagem.includes('fetch')) {
    return 'Não conseguimos conectar. Verifique sua internet e tente de novo.'
  }

  return 'Não foi possível completar. Tente novamente em instantes.'
}

function lancarSeErro(erro: AuthError | null): void {
  if (erro) throw new ErroDeAplicacao(traduzirErroAuth(erro), erro)
}

// T01.2 — Telefone como identificador de login.
//
// GoTrue só entende e-mail. Para deixar telefone entrar sem mexer no
// schema do Supabase Auth (fora do nosso controle), mapeamos o telefone
// normalizado para um e-mail sintético — nunca enviado, nunca lido por
// gente, só existe como chave interna do GoTrue. `.invalid` é o TLD
// reservado pela RFC 2606 pra domínio que nunca deve resolver de
// verdade, então não corre o risco de colidir com um domínio real nem
// de alguém tentar mandar e-mail pra lá.
//
// Isso só funciona porque `enable_confirmations` fica desligado no
// projeto (supabase/config.toml e o painel do projeto hosteado) — um
// e-mail sintético nunca recebe o link de confirmação. Ligar
// confirmação de e-mail no futuro exige tratar cadastro por telefone
// separado (ex.: confirmar por OTP de verdade — ver docs/telefone-login.md).
const DOMINIO_TELEFONE_SINTETICO = 'telefone.empregae.invalid'

function telefoneParaEmailSintetico(telefoneNormalizado: string): string {
  return `tel-${telefoneNormalizado}@${DOMINIO_TELEFONE_SINTETICO}`
}

// --- Validação de campo, para feedback antes da viagem de rede -------------
// Propositalmente simples: quem decide de verdade é o servidor (T00.4 e as
// regras do GoTrue). Isto só pega erro óbvio de digitação na hora.

export function validarNome(nome: string): string | null {
  const limpo = nome.trim()
  if (!limpo) return 'Digite seu nome.'
  if (limpo.length < 2) return 'O nome precisa ter pelo menos 2 letras.'
  return null
}

export function validarEmail(email: string): string | null {
  const limpo = email.trim()
  if (!limpo) return 'Digite seu e-mail.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpo)) return 'Digite um e-mail válido.'
  return null
}

export function validarTelefone(telefone: string): string | null {
  const limpo = telefone.trim()
  if (!limpo) return 'Digite seu telefone.'
  if (!normalizarTelefone(limpo)) return 'Digite um telefone válido, com DDD (ex.: 11 91234-5678).'
  return null
}

// Campo único de login (T01.2) — aceita e-mail ou telefone e valida de
// acordo com o que a pessoa parece ter digitado (telefone.ts#pareceTelefone).
export function validarIdentificador(valor: string): string | null {
  const limpo = valor.trim()
  if (!limpo) return 'Digite seu e-mail ou telefone.'
  return pareceTelefone(limpo) ? validarTelefone(limpo) : validarEmail(limpo)
}

export function validarSenha(senha: string): string | null {
  if (!senha) return 'Digite sua senha.'
  // Mesmo mínimo configurado em supabase/config.toml (minimum_password_length).
  if (senha.length < 8) return 'A senha precisa ter pelo menos 8 caracteres.'
  return null
}

export function validarConfirmacaoSenha(senha: string, confirmacao: string): string | null {
  if (!confirmacao) return 'Digite a senha de novo.'
  if (senha !== confirmacao) return 'As senhas não são iguais.'
  return null
}

// --- Ações -------------------------------------------------------------

type ResultadoCadastro = {
  /** true quando o projeto exige confirmação de e-mail antes do login (não
   * há sessão ainda). false quando a sessão já veio pronta (local/dev,
   * confirmação de e-mail desligada no projeto, ou cadastro por telefone —
   * um e-mail sintético nunca recebe confirmação, então nunca é o caso). */
  precisaConfirmarEmail: boolean
}

/**
 * Cria a conta em auth.users. O `nome` vai como metadata do signup — é dali
 * que o trigger da T01.5 (`criar_profile_no_signup`) lê para preencher
 * `profiles.nome` na mesma transação.
 *
 * `identificador` é e-mail ou telefone, conforme `tipoIdentificador`
 * (T01.2). Telefone vira e-mail sintético para o GoTrue e vai também como
 * metadata `telefone`, de onde o trigger da T01.5 lê para preencher
 * `profiles.telefone` — ver telefoneParaEmailSintetico acima.
 */
export async function cadastrar(params: {
  nome: string
  identificador: string
  tipoIdentificador: 'email' | 'telefone'
  senha: string
}): Promise<ResultadoCadastro> {
  const { nome, identificador, tipoIdentificador, senha } = params

  let email: string
  let telefoneParaMetadata: string | undefined

  if (tipoIdentificador === 'telefone') {
    const normalizado = normalizarTelefone(identificador)
    if (!normalizado) throw new ErroDeAplicacao('Digite um telefone válido, com DDD.')
    email = telefoneParaEmailSintetico(normalizado)
    telefoneParaMetadata = normalizado
  } else {
    email = identificador.trim()
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: {
      data: { nome: nome.trim(), ...(telefoneParaMetadata ? { telefone: telefoneParaMetadata } : {}) },
    },
  })
  lancarSeErro(error)
  return { precisaConfirmarEmail: tipoIdentificador === 'email' && data.session === null }
}

// T01.2 — `identificador` é o que a pessoa digitou no campo único de
// login: e-mail ou telefone. Telefone vira o mesmo e-mail sintético usado
// no cadastro (telefoneParaEmailSintetico) — é assim que o GoTrue encontra
// a conta certa sem saber que 'telefone' existe.
export async function entrar(params: { identificador: string; senha: string }): Promise<void> {
  const { identificador, senha } = params
  const limpo = identificador.trim()
  const normalizado = pareceTelefone(limpo) ? normalizarTelefone(limpo) : null
  const email = normalizado ? telefoneParaEmailSintetico(normalizado) : limpo
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
  lancarSeErro(error)
}

export async function sair(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  lancarSeErro(error)
}

// --- Estado de sessão ----------------------------------------------------
// Hook mínimo para a navegação saber se há alguém logado (Layout mostra
// "Sair" em vez de "Entrar"). Persistência, refresh e proteção de rota são
// da T01.3 — este hook só lê o estado, não decide quem pode ver o quê.

export function useSessao() {
  const [sessao, setSessao] = useState<Session | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let ativo = true

    supabase.auth.getSession().then(({ data }) => {
      if (!ativo) return
      setSessao(data.session)
      setCarregando(false)
    })

    const { data: assinatura } = supabase.auth.onAuthStateChange((_evento, novaSessao) => {
      if (!ativo) return
      setSessao(novaSessao)
      setCarregando(false)
    })

    return () => {
      ativo = false
      assinatura.subscription.unsubscribe()
    }
  }, [])

  return { sessao, carregando }
}
