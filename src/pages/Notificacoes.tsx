import { useEffect, useState } from 'react'
import { useSessao } from '../lib/auth'
import {
  buscarPreferencias,
  salvarPreferencias,
  inscreverPush,
  cancelarInscricaoPush,
  suportaPush,
  type PreferenciasNotificacao,
} from '../lib/notificacoes'
import { ErroDeAplicacao } from '../lib/erros'

type Estado = 'carregando' | 'pronto' | 'erro'

// T08.4 — Preferências (liga/desliga por canal) e o botão de ativar Web
// Push (T08.2) "no momento certo": só pede permissão quando a pessoa clica
// aqui, nunca sozinho ao abrir o app.
export default function Notificacoes() {
  const { sessao, carregando: carregandoSessao } = useSessao()
  const [estado, setEstado] = useState<Estado>('carregando')
  const [preferencias, setPreferencias] = useState<PreferenciasNotificacao | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const [ativandoPush, setAtivandoPush] = useState(false)
  const [pushAtivadoAgora, setPushAtivadoAgora] = useState(false)

  useEffect(() => {
    if (carregandoSessao || !sessao) return
    let ativo = true
    buscarPreferencias(sessao.user.id)
      .then((resultado) => {
        if (!ativo) return
        setPreferencias(resultado)
        setEstado('pronto')
      })
      .catch(() => {
        if (ativo) setEstado('erro')
      })
    return () => {
      ativo = false
    }
  }, [carregandoSessao, sessao])

  async function aoAlternar(campo: keyof PreferenciasNotificacao) {
    if (!sessao || !preferencias) return
    const proximas = { ...preferencias, [campo]: !preferencias[campo] }
    setPreferencias(proximas)
    setErro(null)
    setSalvando(true)
    try {
      await salvarPreferencias(sessao.user.id, proximas)
    } catch (erroCapturado) {
      setPreferencias(preferencias) // desfaz se não salvou
      setErro(erroCapturado instanceof ErroDeAplicacao ? erroCapturado.message : 'Não foi possível salvar.')
    } finally {
      setSalvando(false)
    }
  }

  async function aoAtivarPush() {
    if (!sessao) return
    setErro(null)
    setAtivandoPush(true)
    try {
      await inscreverPush(sessao.user.id)
      setPushAtivadoAgora(true)
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof ErroDeAplicacao ? erroCapturado.message : 'Não foi possível ativar notificações.')
    } finally {
      setAtivandoPush(false)
    }
  }

  async function aoDesativarPush() {
    setErro(null)
    await cancelarInscricaoPush()
    setPushAtivadoAgora(false)
  }

  if (carregandoSessao || estado === 'carregando') return null

  if (estado === 'erro' || !preferencias) {
    return (
      <section className="app-layout" style={{ gridTemplateColumns: '1fr' }}>
        <article className="sidebar profile-detail" style={{ position: 'static', maxWidth: 560 }}>
          <p className="form-alerta">Não foi possível carregar suas preferências. Tente de novo.</p>
        </article>
      </section>
    )
  }

  return (
    <section className="app-layout" style={{ gridTemplateColumns: '1fr' }}>
      <article className="sidebar profile-detail" style={{ position: 'static', maxWidth: 560 }}>
        <div className="section-heading">
          <h2>Notificações</h2>
        </div>

        {erro && <p className="form-alerta">{erro}</p>}

        <label className="onboarding-consentimento">
          <input type="checkbox" checked={preferencias.emailAtivo} disabled={salvando} onChange={() => aoAlternar('emailAtivo')} />
          Receber por e-mail (mensagem nova, contratação, verificação)
        </label>

        <label className="onboarding-consentimento" style={{ marginTop: 10 }}>
          <input type="checkbox" checked={preferencias.pushAtivo} disabled={salvando} onChange={() => aoAlternar('pushAtivo')} />
          Receber por notificação push, quando ativada neste navegador
        </label>

        {suportaPush() ? (
          <p style={{ marginTop: 18 }}>
            <button type="button" className="ghost-button" onClick={pushAtivadoAgora ? aoDesativarPush : aoAtivarPush} disabled={ativandoPush}>
              {ativandoPush ? 'Ativando…' : pushAtivadoAgora ? 'Desativar neste navegador' : 'Ativar notificações neste navegador'}
            </button>
          </p>
        ) : (
          <p className="empty-state" style={{ marginTop: 18 }}>
            Este navegador não suporta notificações push.
          </p>
        )}
      </article>
    </section>
  )
}
