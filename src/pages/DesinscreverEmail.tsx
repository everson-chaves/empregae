import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { desinscreverEmail } from '../lib/notificacoes'

type Estado = 'processando' | 'sucesso' | 'invalido'

// T08.4 — "descadastro no rodapé do e-mail". Pública de propósito: quem
// clica no link do e-mail pode não estar logada no aparelho onde está lendo.
// O token (notification_preferences.desinscricao_token) é o que autoriza a
// ação, via RPC `desinscrever_email` (grant a anon — ver migration da E08).
export default function DesinscreverEmail() {
  const [params] = useSearchParams()
  const token = params.get('token')
  // Estado inicial já nasce correto quando não há token — não precisa de
  // efeito só pra decidir isso (setState em efeito é sinal de valor
  // derivável; aqui dá pra derivar direto na inicialização).
  const [estado, setEstado] = useState<Estado>(token ? 'processando' : 'invalido')

  useEffect(() => {
    if (!token) return
    let ativo = true
    desinscreverEmail(token).then((sucesso) => {
      if (ativo) setEstado(sucesso ? 'sucesso' : 'invalido')
    })
    return () => {
      ativo = false
    }
  }, [token])

  return (
    <section className="app-layout" style={{ gridTemplateColumns: '1fr' }}>
      <article className="sidebar profile-detail" style={{ position: 'static', maxWidth: 560 }}>
        <h2>Notificações por e-mail</h2>
        {estado === 'processando' && <p>Processando…</p>}
        {estado === 'sucesso' && <p>Pronto — você não vai mais receber e-mails do Empregaê. Pode reativar a qualquer momento na tela de Notificações, dentro da sua conta.</p>}
        {estado === 'invalido' && <p className="form-alerta">Link inválido ou já usado.</p>}
      </article>
    </section>
  )
}
