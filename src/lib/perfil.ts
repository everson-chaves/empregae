import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { desembrulhar, exigirLinha } from './erros'
import type { Enums } from './supabase'

// T01.6 — Onboarding: escolha de tipo de perfil e consentimento LGPD.
//
// Fica em arquivo próprio, e não em auth.ts, porque isto já é acesso à
// tabela `profiles` (dado de domínio), não autenticação — mesma divisão que
// o resto do projeto usa (T00.7: auth.ts só cuida de sessão/GoTrue).

export type TipoPerfil = Enums['tipo_perfil']

export async function buscarStatusOnboarding(
  id: string,
): Promise<{ tipo: TipoPerfil; consentimentoLgpdEm: string | null }> {
  const linha = desembrulhar<{ tipo: TipoPerfil; consentimento_lgpd_em: string | null }>(
    await supabase.from('profiles').select('tipo, consentimento_lgpd_em').eq('id', id).single(),
  )
  return { tipo: linha.tipo, consentimentoLgpdEm: linha.consentimento_lgpd_em }
}

/**
 * Grava a escolha de tipo (cliente/profissional/ambos) e marca o
 * consentimento LGPD com o instante atual — é isso que tira a pessoa do
 * estado "onboarding pendente" (useOnboardingPendente, abaixo).
 */
export async function concluirOnboarding(id: string, tipo: TipoPerfil): Promise<void> {
  exigirLinha(
    await supabase
      .from('profiles')
      .update({ tipo, consentimento_lgpd_em: new Date().toISOString() })
      .eq('id', id)
      .select(),
  )
}

type EstadoDeOnboarding = 'carregando' | 'pendente' | 'concluido'

/**
 * RotaProtegida (T01.3) usa isto para desviar qualquer rota protegida para
 * `/onboarding` enquanto o consentimento não foi dado — garante que ninguém
 * chega direto em `/meu-perfil` ou `/conversas` pulando o onboarding, só por
 * saber a URL.
 *
 * Deliberadamente não cobre rotas públicas (`/`, perfil público) — a busca
 * continua aberta para quem só quer olhar, sem sessão nenhuma; o gate só
 * existe para quem tenta usar algo que exige estar logado.
 */
export function useOnboardingPendente(sessao: Session | null): EstadoDeOnboarding {
  const [estado, setEstado] = useState<EstadoDeOnboarding>('carregando')

  useEffect(() => {
    if (!sessao) return

    let ativo = true

    buscarStatusOnboarding(sessao.user.id)
      .then(({ consentimentoLgpdEm }) => {
        if (!ativo) return
        setEstado(consentimentoLgpdEm ? 'concluido' : 'pendente')
      })
      .catch(() => {
        // Se a leitura falhar (rede, RLS, o que for), não trava a pessoa
        // fora do app inteiro por causa do gate de onboarding — deixa
        // passar. Pior caso: alguém vê /onboarding de novo depois.
        if (ativo) setEstado('concluido')
      })

    return () => {
      ativo = false
    }
  }, [sessao])

  return estado
}
