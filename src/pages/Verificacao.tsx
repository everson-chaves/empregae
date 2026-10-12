import { type ChangeEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSessao } from '../lib/auth'
import { buscarMeuAnuncio } from '../lib/anuncio'
import {
  buscarMinhaVerificacaoAtual,
  solicitarVerificacao,
  temSeloAtivo,
  validarArquivoDocumento,
  RUBRICA_STATUS_VERIFICACAO,
  type VerificationPublica,
} from '../lib/verificacao'
import { ErroDeAplicacao } from '../lib/erros'

type Estado = 'carregando' | 'pronto' | 'sem-anuncio' | 'erro'

// E07 — Verificação e selo (T07.1 upload, T07.2 solicitação/reenvio, T07.3
// selo — ver PerfilProfissional.tsx e Busca.tsx). No piloto a aprovação é
// manual pelo admin (T09.2, fora desta epic): esta tela só mostra o status
// mais recente e permite enviar ou reenviar o documento.
export default function Verificacao() {
  const { sessao, carregando: carregandoSessao } = useSessao()
  const [estado, setEstado] = useState<Estado>('carregando')
  const [workerProfileId, setWorkerProfileId] = useState<string | null>(null)
  const [verificadoAte, setVerificadoAte] = useState<string | null>(null)
  const [verificacao, setVerificacao] = useState<VerificationPublica | null>(null)

  const [arquivo, setArquivo] = useState<File | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (carregandoSessao || !sessao) return
    let ativo = true

    buscarMeuAnuncio(sessao.user.id)
      .then(async (meuAnuncio) => {
        if (!ativo) return
        if (!meuAnuncio.anuncio) {
          setEstado('sem-anuncio')
          return
        }
        setWorkerProfileId(meuAnuncio.anuncio.id)
        setVerificadoAte(meuAnuncio.anuncio.verificado_ate)
        const atual = await buscarMinhaVerificacaoAtual(meuAnuncio.anuncio.id)
        if (!ativo) return
        setVerificacao(atual)
        setEstado('pronto')
      })
      .catch(() => {
        if (!ativo) return
        setEstado('erro')
      })

    return () => {
      ativo = false
    }
  }, [carregandoSessao, sessao])

  function aoSelecionarArquivo(evento: ChangeEvent<HTMLInputElement>) {
    const selecionado = evento.target.files?.[0] ?? null
    setErro(null)
    if (selecionado) {
      const erroValidacao = validarArquivoDocumento(selecionado)
      if (erroValidacao) {
        setErro(erroValidacao)
        setArquivo(null)
        return
      }
    }
    setArquivo(selecionado)
  }

  async function aoEnviar() {
    if (!workerProfileId || !arquivo) return
    setErro(null)
    setEnviando(true)
    try {
      const nova = await solicitarVerificacao({ workerProfileId, arquivo })
      setVerificacao(nova)
      setArquivo(null)
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof ErroDeAplicacao ? erroCapturado.message : 'Não foi possível enviar o documento.')
    } finally {
      setEnviando(false)
    }
  }

  if (carregandoSessao || estado === 'carregando') return null

  if (estado === 'sem-anuncio') {
    return (
      <section className="app-layout" style={{ gridTemplateColumns: '1fr' }}>
        <article className="sidebar profile-detail" style={{ position: 'static', maxWidth: 620 }}>
          <h2>Verificação e selo</h2>
          <p>Para solicitar verificação, complete seu anúncio de profissional primeiro.</p>
          <Link to="/meu-perfil">Ir para Meu perfil</Link>
        </article>
      </section>
    )
  }

  if (estado === 'erro') {
    return (
      <section className="app-layout" style={{ gridTemplateColumns: '1fr' }}>
        <article className="sidebar profile-detail" style={{ position: 'static', maxWidth: 620 }}>
          <p className="form-alerta">Não foi possível carregar sua verificação. Tente de novo.</p>
        </article>
      </section>
    )
  }

  const seloAtivo = temSeloAtivo(verificadoAte)
  const podeEnviar = !verificacao || verificacao.status === 'reprovado'

  return (
    <section className="app-layout" style={{ gridTemplateColumns: '1fr' }}>
      <article className="sidebar profile-detail" style={{ position: 'static', maxWidth: 620 }}>
        <p className="eyebrow">E07 — Verificação</p>
        <h2>Verificação e selo</h2>

        {seloAtivo && (
          <p className="tag tag-featured" style={{ display: 'inline-flex', marginBottom: 12 }}>
            Selo ativo até {new Date(verificadoAte as string).toLocaleDateString('pt-BR')}
          </p>
        )}

        {verificacao && (
          <p>
            Última solicitação: <strong>{RUBRICA_STATUS_VERIFICACAO[verificacao.status]}</strong>
            {verificacao.observacao && ` — ${verificacao.observacao}`}
          </p>
        )}

        <p>
          No piloto, a consulta de antecedentes é feita manualmente pelo grupo, fora do sistema — o documento enviado
          aqui fica num bucket privado, visível só para o admin.{' '}
          <Link to="/verificacao/escopo">Veja exatamente o que é checado</Link>.
        </p>

        {podeEnviar ? (
          <div className="briefing-form">
            {erro && <p className="form-alerta">{erro}</p>}
            <label>
              {verificacao?.status === 'reprovado' ? 'Reenviar documento' : 'Documento de identidade (JPEG, PNG ou PDF, até 8MB)'}
              <input type="file" accept="image/jpeg,image/png,application/pdf" onChange={aoSelecionarArquivo} />
            </label>
            <button type="button" onClick={aoEnviar} disabled={!arquivo || enviando}>
              {enviando ? 'Enviando…' : verificacao?.status === 'reprovado' ? 'Reenviar' : 'Enviar para análise'}
            </button>
          </div>
        ) : (
          <p className="empty-state">
            {verificacao?.status === 'pendente' ? 'Seu documento está em análise.' : 'Sua verificação já está aprovada.'}
          </p>
        )}

        <p style={{ marginTop: 18 }}>
          <a
            className="ghost-button"
            style={{ display: 'inline-flex', alignItems: 'center', padding: '0 16px' }}
            href="https://github.com/everson-chaves/empregae/issues/57"
            target="_blank"
            rel="noreferrer"
          >
            Acompanhar issue #57
          </a>
        </p>
      </article>
    </section>
  )
}
