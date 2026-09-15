import { useEffect, useState } from 'react'
import type { AuthError, Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { ErroDeAplicacao } from './erros'

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
   * há sessão ainda). false quando a sessão já veio pronta (local/dev, ou
   * confirmação de e-mail desligada no projeto). */
  precisaConfirmarEmail: boolean
}

/**
 * Cria a conta em auth.users. O `nome` vai como metadata do signup — é dali
 * que o trigger da T01.5 (`criar_profile_no_signup`) lê para preencher
 * `profiles.nome` na mesma transação.
 */
export async function cadastrar(params: {
  nome: string
  email: string
  senha: string
}): Promise<ResultadoCadastro> {
  const { nome, email, senha } = params
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password: senha,
    options: { data: { nome: nome.trim() } },
  })
  lancarSeErro(error)
  return { precisaConfirmarEmail: data.session === null }
}

export async function entrar(params: { email: string; senha: string }): Promise<void> {
  const { email, senha } = params
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password: senha,
  })
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
