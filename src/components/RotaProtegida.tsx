import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useSessao } from '../lib/auth'
import { useOnboardingPendente } from '../lib/perfil'

// T01.3 — Sessão e rotas protegidas (redirecionamento).
//
// Persistência e refresh de token já vêm de graça do supabase-js
// (`persistSession` e `autoRefreshToken`, configurados em lib/supabase.ts,
// T00.7). O que faltava era isto: quem não está logado não entra numa rota
// que precisa de sessão, e volta pra ela depois de logar.
//
// Não decide QUEM pode ver o quê além de "está logado ou não" — regra fina
// por papel (ex.: só admin em /admin) é da epic dona daquela rota.
//
// T01.6 — Também não deixa passar quem está logado mas ainda não completou
// o onboarding (consentimento LGPD + escolha de tipo de perfil). `/onboarding`
// é ela mesma uma rota protegida — a checagem de path abaixo evita o loop de
// redirecionar onboarding para onboarding.
export default function RotaProtegida({ children }: { children: ReactNode }) {
  const { sessao, carregando } = useSessao()
  const local = useLocation()
  const onboardingPendente = useOnboardingPendente(sessao)

  // Evita um "pisca" de redirecionamento para /entrar antes da sessão
  // terminar de carregar do localStorage na primeira renderização.
  if (carregando) return null

  if (!sessao) {
    return <Navigate to="/entrar" state={{ de: local.pathname }} replace />
  }

  if (onboardingPendente === 'carregando') return null

  if (onboardingPendente === 'pendente' && local.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }

  return <>{children}</>
}
