import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { traduzirErro } from '../lib/erros'

// Página de diagnóstico da camada de dados. Só existe em desenvolvimento —
// a rota não é registrada no build de produção.
//
// Serve para responder, em dez segundos, à pergunta que todo dev vai fazer
// pelo menos uma vez: "não está conectando, e o problema é o meu .env, o
// Docker, ou o código?".

type Checagem = {
  nome: string
  estado: 'rodando' | 'ok' | 'falhou'
  detalhe: string
}

export default function Diagnostico() {
  // Estado inicial já é "rodando". Definir isso com setState dentro do efeito
  // dispararia um render a mais sem necessidade.
  const [checagens, setChecagens] = useState<Checagem[]>([
    { nome: 'Conectando...', estado: 'rodando', detalhe: '' },
  ])

  useEffect(() => {
    async function rodar() {
      const resultados: Checagem[] = []

      // 1. Leitura pública: as categorias são legíveis por anon (T00.4).
      const categorias = await supabase
        .from('categories')
        .select('id', { count: 'exact', head: true })
      resultados.push({
        nome: 'Leitura pública (categorias)',
        estado: categorias.error ? 'falhou' : 'ok',
        detalhe: categorias.error
          ? traduzirErro(categorias.error)
          : `${categorias.count ?? 0} categorias encontradas`,
      })

      // 2. Busca de anúncios ativos, também pública.
      const anuncios = await supabase
        .from('worker_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('ativo', true)
      resultados.push({
        nome: 'Anúncios ativos',
        estado: anuncios.error ? 'falhou' : 'ok',
        detalhe: anuncios.error
          ? traduzirErro(anuncios.error)
          : `${anuncios.count ?? 0} profissionais ativos no seed`,
      })

      // 3. A RLS está mesmo barrando? Sem sessão, mensagens devem vir vazias.
      //    Se isto retornar linha, a RLS está aberta e é problema grave.
      const mensagens = await supabase.from('messages').select('id')
      const vazou = !mensagens.error && (mensagens.data?.length ?? 0) > 0
      resultados.push({
        nome: 'RLS bloqueando mensagens alheias',
        estado: vazou ? 'falhou' : 'ok',
        detalhe: vazou
          ? `VAZAMENTO: ${mensagens.data?.length} mensagens visíveis sem login`
          : 'nenhuma mensagem visível sem login, como esperado',
      })

      // 4. A coluna do telefone está mesmo revogada? (T00.4)
      const telefone = await supabase.from('profiles').select('telefone')
      resultados.push({
        nome: 'Coluna telefone protegida',
        estado: telefone.error ? 'ok' : 'falhou',
        detalhe: telefone.error
          ? `recusada pelo banco: "${traduzirErro(telefone.error)}"`
          : 'VAZAMENTO: o telefone foi retornado sem login',
      })

      setChecagens(resultados)
    }

    rodar().catch((e: unknown) => {
      setChecagens([
        { nome: 'Falha geral', estado: 'falhou', detalhe: traduzirErro(e) },
      ])
    })
  }, [])

  const cor = (estado: Checagem['estado']) =>
    estado === 'ok' ? 'var(--green)' : estado === 'falhou' ? 'var(--terracotta)' : 'var(--muted)'

  return (
    <section className="app-layout" style={{ gridTemplateColumns: '1fr' }}>
      <article className="sidebar" style={{ position: 'static', maxWidth: 680 }}>
        <p className="eyebrow">E00 — Fundação · só em desenvolvimento</p>
        <h2>Diagnóstico da camada de dados</h2>
        <p>
          Servidor: <code>{import.meta.env.VITE_SUPABASE_URL}</code>
        </p>

        <div style={{ display: 'grid', gap: 12, marginTop: 22 }}>
          {checagens.map((c) => (
            <div
              key={c.nome}
              style={{
                padding: 14,
                border: '1px solid var(--line)',
                borderRadius: 12,
                background: '#fff',
              }}
            >
              <strong style={{ color: cor(c.estado) }}>
                {c.estado === 'ok' ? '✓' : c.estado === 'falhou' ? '✕' : '…'} {c.nome}
              </strong>
              {c.detalhe && (
                <div style={{ color: 'var(--muted)', marginTop: 4 }}>{c.detalhe}</div>
              )}
            </div>
          ))}
        </div>

        <p style={{ color: 'var(--muted)', marginTop: 22, lineHeight: 1.6 }}>
          Se tudo falhar de uma vez, o Docker provavelmente está parado: rode{' '}
          <code>npm run db:start</code>. Se as checagens de RLS falharem, é grave — a
          política de acesso está aberta e alguém consegue ler dado alheio.
        </p>
      </article>
    </section>
  )
}
