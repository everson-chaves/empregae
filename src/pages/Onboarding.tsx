import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessao } from '../lib/auth'
import { concluirOnboarding, type TipoPerfil } from '../lib/perfil'
import { ErroDeAplicacao } from '../lib/erros'

const OPCOES: Array<{ valor: TipoPerfil; rotulo: string; descricao: string }> = [
  { valor: 'cliente', rotulo: 'Cliente', descricao: 'Quero contratar profissionais.' },
  { valor: 'profissional', rotulo: 'Profissional', descricao: 'Quero anunciar meus serviços.' },
  { valor: 'ambos', rotulo: 'Os dois', descricao: 'Quero contratar e também anunciar.' },
]

// T01.6 — Onboarding.
//
// RotaProtegida (T01.3, via useOnboardingPendente em lib/perfil.ts) manda
// pra cá qualquer pessoa logada que ainda não passou por aqui — depois de
// cadastrar (Cadastrar.tsx navega direto pra esta rota) e também, como
// rede de segurança, na primeira vez que tentar abrir qualquer outra rota
// que exige sessão.
export default function Onboarding() {
  const { sessao } = useSessao()
  const navegar = useNavigate()

  const [tipo, setTipo] = useState<TipoPerfil>('cliente')
  const [consentimento, setConsentimento] = useState(false)
  const [erroConsentimento, setErroConsentimento] = useState<string | null>(null)
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault()
    setErroGeral(null)
    setErroConsentimento(null)

    if (!consentimento) {
      setErroConsentimento('Para continuar, você precisa concordar com o uso dos seus dados.')
      return
    }

    // RotaProtegida já garante sessão antes de renderizar esta página; isto
    // só protege contra o instante entre a sessão expirar e o próximo
    // redirecionamento.
    if (!sessao) {
      setErroGeral('Sua sessão expirou. Entre novamente.')
      return
    }

    setEnviando(true)
    try {
      await concluirOnboarding(sessao.user.id, tipo)
      navegar(tipo === 'cliente' ? '/' : '/meu-perfil', { replace: true })
    } catch (erro) {
      setErroGeral(erro instanceof ErroDeAplicacao ? erro.message : 'Algo deu errado. Tente de novo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="auth-page">
      <form className="signup-form" onSubmit={aoEnviar} noValidate>
        <h1>Só mais um passo</h1>
        <p className="auth-subtitulo">Como você pretende usar o Empregaê?</p>

        {erroGeral && <p className="form-alerta">{erroGeral}</p>}

        <div className="full onboarding-tipo" role="radiogroup" aria-label="Como você vai usar o Empregaê">
          {OPCOES.map((opcao) => (
            <button
              key={opcao.valor}
              type="button"
              role="radio"
              aria-checked={tipo === opcao.valor}
              className={`category-button${tipo === opcao.valor ? ' is-active' : ''}`}
              onClick={() => setTipo(opcao.valor)}
            >
              <strong>{opcao.rotulo}</strong>
              <small>{opcao.descricao}</small>
            </button>
          ))}
        </div>

        <label className="full onboarding-consentimento">
          <input
            type="checkbox"
            checked={consentimento}
            onChange={(evento) => {
              setConsentimento(evento.target.checked)
              setErroConsentimento(null)
            }}
            aria-invalid={Boolean(erroConsentimento)}
          />
          <span>
            Autorizo o Empregaê a usar meus dados de cadastro (nome, contato e localização
            aproximada) para o funcionamento do app, conforme a LGPD.
          </span>
        </label>
        {erroConsentimento && <p className="campo-erro full">{erroConsentimento}</p>}

        <button type="submit" disabled={enviando}>
          {enviando ? 'Salvando…' : 'Continuar'}
        </button>
      </form>
    </div>
  )
}
