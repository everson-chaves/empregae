import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { buscarAnuncioPublico, formatarPreco, type AnuncioPublico } from '../lib/anuncio'

type Estado = 'carregando' | 'encontrado' | 'nao-encontrado' | 'erro'

// T02.6 — Página pública do anúncio.
//
// Sem telefone, sem coordenada exata: `buscarAnuncioPublico` só busca
// colunas que estão no GRANT de select da RLS (T00.4), então essas duas
// simplesmente não têm como aparecer aqui, nem por engano.
//
// "Distância" (prevista no T02.6 original) fica de fora por enquanto: ela
// só faz sentido a partir de uma busca que sabe de onde o cliente está
// olhando, e isso é a T03.1 (E03 — Busca geográfica), que ainda não existe.
// Quando entrar, esta página recebe a distância já calculada via query
// string ou state da navegação, não recalcula nada aqui.
//
// O botão "Iniciar conversa" (T04.1, E04 — Chat) também ainda não existe:
// fica visível e desabilitado, com a explicação, em vez de simplesmente
// sumir — a pessoa sabe que a função está a caminho, não que quebrou.
function PaginaNaoEncontrada() {
  return (
    <section className="app-layout" style={{ gridTemplateColumns: '1fr' }}>
      <article className="sidebar profile-detail" style={{ position: 'static', maxWidth: 620 }}>
        <h2>Anúncio não encontrado</h2>
        <p>Este profissional não existe ou não está com o anúncio publicado no momento.</p>
      </article>
    </section>
  )
}

export default function PerfilProfissional() {
  const { id } = useParams<{ id: string }>()
  const [estado, setEstado] = useState<Estado>('carregando')
  const [dados, setDados] = useState<AnuncioPublico | null>(null)

  useEffect(() => {
    if (!id) return
    let ativo = true
    buscarAnuncioPublico(id)
      .then((resultado) => {
        if (!ativo) return
        setDados(resultado)
        setEstado(resultado ? 'encontrado' : 'nao-encontrado')
      })
      .catch(() => {
        if (ativo) setEstado('erro')
      })
    return () => {
      ativo = false
    }
  }, [id])

  // Sem :id na rota não há o que buscar — não é um estado de carregamento,
  // é o mesmo "não encontrado" de um id que não existe. Decidido no render,
  // não dentro do efeito.
  if (!id) return <PaginaNaoEncontrada />
  if (estado === 'carregando') return null

  if (estado === 'erro') {
    return (
      <section className="app-layout" style={{ gridTemplateColumns: '1fr' }}>
        <article className="sidebar profile-detail" style={{ position: 'static', maxWidth: 620 }}>
          <p className="form-alerta">Não foi possível carregar este perfil. Tente de novo.</p>
        </article>
      </section>
    )
  }

  if (estado === 'nao-encontrado' || !dados) {
    return <PaginaNaoEncontrada />
  }

  const { perfil, anuncio, categorias } = dados
  const selo = anuncio.verificado_ate && new Date(anuncio.verificado_ate) >= new Date()

  return (
    <section className="app-layout" style={{ gridTemplateColumns: '1fr' }}>
      <article className="sidebar profile-detail" style={{ position: 'static', maxWidth: 620 }}>
        <div className="profile-head worker-top">
          <div className="avatar avatar-large">
            {perfil.avatarUrl ? (
              <img className="avatar-img" src={perfil.avatarUrl} alt="" />
            ) : (
              <span className="avatar-fallback">{perfil.nome.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div>
            <h2>{perfil.nome}</h2>
            <p>
              {anuncio.bairro}, {anuncio.cidade}/{anuncio.uf}
            </p>
          </div>
        </div>

        <div className="tag-row">
          {selo && <span className="tag tag-featured">Verificado</span>}
          {anuncio.preco_medio_centavos !== null && anuncio.unidade_preco && (
            <span className="tag">{formatarPreco(anuncio.preco_medio_centavos, anuncio.unidade_preco)}</span>
          )}
          <span className="tag">Atende num raio de {anuncio.raio_atendimento_km} km</span>
        </div>

        {categorias.length > 0 && (
          <div className="tag-row" style={{ marginTop: 10 }}>
            {categorias.map((categoria) => (
              <span key={categoria.id} className="tag tag-match">
                {categoria.nome}
              </span>
            ))}
          </div>
        )}

        {anuncio.descricao && <p style={{ marginTop: 16 }}>{anuncio.descricao}</p>}

        <div className="profile-actions">
          <button type="button" className="hire-button" disabled title="O chat ainda está em construção (E04).">
            Iniciar conversa
          </button>
        </div>
      </article>
    </section>
  )
}
