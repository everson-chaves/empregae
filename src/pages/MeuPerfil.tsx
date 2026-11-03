import { type ChangeEvent, type FormEvent, useEffect, useState } from 'react'
import { useSessao } from '../lib/auth'
import {
  buscarCategorias,
  buscarMeuAnuncio,
  buscarTipoPerfil,
  definirAtivo,
  definirCategorias,
  enviarFotoDePerfil,
  geocodificarEndereco,
  salvarAnuncio,
  buscarEnderecoPorCep,
  type Categoria,
  type EnderecoPorCep,
  type MeuAnuncio,
  type TipoPerfil,
  type UnidadePreco,
} from '../lib/anuncio'
import { ErroDeAplicacao } from '../lib/erros'

const LIMITE_CATEGORIAS = 5
const UNIDADES: Array<{ valor: UnidadePreco; rotulo: string }> = [
  { valor: 'hora', rotulo: 'Por hora' },
  { valor: 'diaria', rotulo: 'Por diária' },
  { valor: 'servico', rotulo: 'Por serviço' },
]

type EstadoDeCarga = 'carregando' | 'pronto' | 'erro'

// E02 — Meu perfil (T02.1 CRUD, T02.2 foto, T02.3 categorias, T02.4 preço,
// T02.5 endereço). T02.6 (página pública) é PerfilProfissional.tsx.
//
// "Salvar anúncio" grava tudo de uma vez (dados + categorias + foto, se
// trocada) — não existe rascunho parcial no banco. "Publicar"/"Despublicar"
// é uma ação separada: só liga o `ativo`, e só funciona se o anúncio já
// estiver completo (a constraint `perfil_ativo_esta_completo` garante isso
// no banco, não só no formulário).
export default function MeuPerfil() {
  const { sessao, carregando: carregandoSessao } = useSessao()
  const profileId = sessao?.user.id

  const [estadoDeCarga, setEstadoDeCarga] = useState<EstadoDeCarga>('carregando')
  const [tipoPerfil, setTipoPerfil] = useState<TipoPerfil | null>(null)
  const [anuncio, setAnuncio] = useState<MeuAnuncio | null>(null)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  // Campos do formulário.
  const [descricao, setDescricao] = useState('')
  const [precoReais, setPrecoReais] = useState('')
  const [unidadePreco, setUnidadePreco] = useState<UnidadePreco>('hora')
  const [raioKm, setRaioKm] = useState(5)
  const [categoriaIds, setCategoriaIds] = useState<Set<string>>(new Set())

  // Endereço: o CEP precisa ser confirmado (botão "Buscar") antes de salvar —
  // digitar o CEP sozinho não garante que bairro/cidade/UF estão corretos.
  const [cep, setCep] = useState('')
  const [endereco, setEndereco] = useState<EnderecoPorCep | null>(null)
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [erroCep, setErroCep] = useState<string | null>(null)

  // Foto — arquivo e preview vivem juntos: nascem e trocam no mesmo evento,
  // nunca via efeito (setState em efeito é sinal de estado derivável, e
  // aqui o valor certo já está disponível no evento que o disparou).
  const [foto, setFoto] = useState<{ arquivo: File; previewUrl: string } | null>(null)
  const [erroFoto, setErroFoto] = useState<string | null>(null)

  const [salvando, setSalvando] = useState(false)
  const [erroSalvar, setErroSalvar] = useState<string | null>(null)
  const [avisoSalvo, setAvisoSalvo] = useState(false)

  const [alternandoAtivo, setAlternandoAtivo] = useState(false)
  const [erroAtivo, setErroAtivo] = useState<string | null>(null)

  useEffect(() => {
    if (!profileId) return
    let ativo = true

    Promise.all([buscarTipoPerfil(profileId), buscarMeuAnuncio(profileId), buscarCategorias()])
      .then(([tipo, meuAnuncio, todasCategorias]) => {
        if (!ativo) return
        setTipoPerfil(tipo)
        setAnuncio(meuAnuncio)
        setCategorias(todasCategorias)
        setAvatarUrl(meuAnuncio.perfil?.avatarUrl ?? null)

        if (meuAnuncio.anuncio) {
          const a = meuAnuncio.anuncio
          setDescricao(a.descricao ?? '')
          setPrecoReais(a.preco_medio_centavos !== null ? (a.preco_medio_centavos / 100).toFixed(2) : '')
          setUnidadePreco(a.unidade_preco ?? 'hora')
          setRaioKm(a.raio_atendimento_km)
          if (a.bairro && a.cidade && a.uf) {
            setEndereco({ cep: '', logradouro: '', bairro: a.bairro, cidade: a.cidade, uf: a.uf })
          }
        }
        setCategoriaIds(new Set(meuAnuncio.categoriaIds))
        setEstadoDeCarga('pronto')
      })
      .catch(() => {
        if (ativo) setEstadoDeCarga('erro')
      })

    return () => {
      ativo = false
    }
  }, [profileId])

  function aoEscolherFoto(evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0]
    evento.target.value = ''
    if (!arquivo) return
    setErroFoto(null)
    // Libera a URL do preview anterior antes de criar a próxima — senão cada
    // troca de foto vaza um object URL até a aba fechar.
    setFoto((atual) => {
      if (atual) URL.revokeObjectURL(atual.previewUrl)
      return { arquivo, previewUrl: URL.createObjectURL(arquivo) }
    })
  }

  function alternarCategoria(id: string) {
    setCategoriaIds((atual) => {
      const proximo = new Set(atual)
      if (proximo.has(id)) {
        proximo.delete(id)
      } else {
        if (proximo.size >= LIMITE_CATEGORIAS) return atual
        proximo.add(id)
      }
      return proximo
    })
  }

  async function aoBuscarCep() {
    setErroCep(null)
    setBuscandoCep(true)
    try {
      const resultado = await buscarEnderecoPorCep(cep)
      setEndereco(resultado)
    } catch (erro) {
      setEndereco(null)
      setErroCep(erro instanceof ErroDeAplicacao ? erro.message : 'Não foi possível buscar o CEP.')
    } finally {
      setBuscandoCep(false)
    }
  }

  function validar(): string | null {
    if (descricao.trim().length < 20) return 'Escreva uma descrição com pelo menos 20 caracteres.'
    const preco = Number(precoReais.replace(',', '.'))
    if (!precoReais || Number.isNaN(preco) || preco <= 0) return 'Informe um preço válido.'
    if (raioKm < 1 || raioKm > 100) return 'O raio de atendimento precisa ser entre 1 e 100 km.'
    if (categoriaIds.size === 0) return 'Escolha pelo menos uma categoria de atendimento.'
    if (!endereco) return 'Busque seu CEP para confirmar o endereço antes de salvar.'
    return null
  }

  async function aoSalvar(evento: FormEvent) {
    evento.preventDefault()
    setErroSalvar(null)
    setAvisoSalvo(false)

    const mensagemValidacao = validar()
    if (mensagemValidacao) {
      setErroSalvar(mensagemValidacao)
      return
    }
    if (!profileId || !endereco) return

    setSalvando(true)
    try {
      if (foto) {
        const url = await enviarFotoDePerfil(profileId, foto.arquivo)
        setAvatarUrl(url)
        URL.revokeObjectURL(foto.previewUrl)
        setFoto(null)
      }

      // Geocodifica o endereço pra gravar a coordenada (ver lib/anuncio.ts
      // sobre a solução provisória com Nominatim). Se falhar, o anúncio é
      // salvo do mesmo jeito — só não poderá ser publicado até funcionar.
      const enderecoCompleto = [endereco.logradouro, endereco.bairro, endereco.cidade, endereco.uf, 'Brasil']
        .filter(Boolean)
        .join(', ')
      const coordenada = await geocodificarEndereco(enderecoCompleto)

      const precoCentavos = Math.round(Number(precoReais.replace(',', '.')) * 100)

      const anuncioSalvo = await salvarAnuncio(profileId, {
        descricao: descricao.trim(),
        precoMedioCentavos: precoCentavos,
        unidadePreco,
        raioAtendimentoKm: raioKm,
        bairro: endereco.bairro,
        cidade: endereco.cidade,
        uf: endereco.uf,
        coordenada,
      })

      await definirCategorias(anuncioSalvo.id, Array.from(categoriaIds))

      setAnuncio((atual) => ({
        perfil: atual?.perfil ?? null,
        anuncio: anuncioSalvo,
        categoriaIds: Array.from(categoriaIds),
      }))
      setAvisoSalvo(true)
      if (!coordenada) {
        setErroSalvar(
          'Salvo, mas não conseguimos localizar esse endereço no mapa — tente conferir o CEP. ' +
            'Sem isso o anúncio não pode ser publicado.',
        )
      }
    } catch (erro) {
      setErroSalvar(erro instanceof ErroDeAplicacao ? erro.message : 'Algo deu errado ao salvar. Tente de novo.')
    } finally {
      setSalvando(false)
    }
  }

  async function aoAlternarAtivo() {
    if (!anuncio?.anuncio) return
    setErroAtivo(null)
    setAlternandoAtivo(true)
    const proximoAtivo = !anuncio.anuncio.ativo
    try {
      await definirAtivo(anuncio.anuncio.id, proximoAtivo)
      setAnuncio((atual) =>
        atual?.anuncio ? { ...atual, anuncio: { ...atual.anuncio, ativo: proximoAtivo } } : atual,
      )
    } catch (erro) {
      setErroAtivo(erro instanceof ErroDeAplicacao ? erro.message : 'Não foi possível atualizar o anúncio.')
    } finally {
      setAlternandoAtivo(false)
    }
  }

  if (carregandoSessao || estadoDeCarga === 'carregando') return null

  if (estadoDeCarga === 'erro') {
    return (
      <div className="auth-page">
        <p className="form-alerta">Não foi possível carregar seu perfil. Recarregue a página.</p>
      </div>
    )
  }

  if (tipoPerfil === 'cliente') {
    return (
      <div className="auth-page">
        <div className="signup-form">
          <h1>Meu perfil</h1>
          <p className="auth-subtitulo">
            Esta página é para quem anuncia serviços. Sua conta está marcada como cliente — não há
            anúncio para gerenciar aqui.
          </p>
        </div>
      </div>
    )
  }

  const fotoParaExibir = foto?.previewUrl ?? avatarUrl

  return (
    <div className="auth-page">
      <form className="signup-form" onSubmit={aoSalvar} noValidate>
        <h1>Meu perfil</h1>
        <p className="auth-subtitulo">O que aparece no seu anúncio público.</p>

        {erroSalvar && <p className="form-alerta full">{erroSalvar}</p>}
        {avisoSalvo && !erroSalvar && <p className="form-aviso full">Anúncio salvo.</p>}

        <div className="full anuncio-foto">
          <div className="avatar avatar-large">
            {fotoParaExibir ? (
              <img className="avatar-img" src={fotoParaExibir} alt="" />
            ) : (
              <span className="avatar-fallback">{(anuncio?.perfil?.nome ?? '?').charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div>
            <label className="ghost-button anuncio-foto-botao">
              Trocar foto
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={aoEscolherFoto}
                hidden
              />
            </label>
            {erroFoto && <p className="campo-erro">{erroFoto}</p>}
          </div>
        </div>

        <label className="full">
          Descrição
          <textarea
            rows={4}
            maxLength={2000}
            value={descricao}
            onChange={(evento) => setDescricao(evento.target.value)}
            placeholder="Conte o que você faz, sua experiência e como trabalha."
          />
        </label>

        <div className="full">
          <p className="campo-rotulo">Categorias de atendimento (até {LIMITE_CATEGORIAS})</p>
          <div className="category-list" role="group" aria-label="Categorias de atendimento">
            {categorias.map((categoria) => (
              <button
                key={categoria.id}
                type="button"
                aria-pressed={categoriaIds.has(categoria.id)}
                className={`category-button${categoriaIds.has(categoria.id) ? ' is-active' : ''}`}
                onClick={() => alternarCategoria(categoria.id)}
              >
                {categoria.nome}
              </button>
            ))}
          </div>
        </div>

        <label>
          Preço médio (R$)
          <input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={precoReais}
            onChange={(evento) => setPrecoReais(evento.target.value)}
          />
        </label>

        <div>
          <p className="campo-rotulo">Cobrança</p>
          <div className="category-list" role="radiogroup" aria-label="Unidade de cobrança">
            {UNIDADES.map((opcao) => (
              <button
                key={opcao.valor}
                type="button"
                role="radio"
                aria-checked={unidadePreco === opcao.valor}
                className={`category-button${unidadePreco === opcao.valor ? ' is-active' : ''}`}
                onClick={() => setUnidadePreco(opcao.valor)}
              >
                {opcao.rotulo}
              </button>
            ))}
          </div>
        </div>

        <label className="full anuncio-cep">
          CEP
          <div className="anuncio-cep-linha">
            <input
              type="text"
              inputMode="numeric"
              placeholder="00000-000"
              value={cep}
              onChange={(evento) => setCep(evento.target.value)}
            />
            <button type="button" className="secondary-button" onClick={aoBuscarCep} disabled={buscandoCep}>
              {buscandoCep ? 'Buscando…' : 'Buscar'}
            </button>
          </div>
        </label>
        {erroCep && <p className="campo-erro full">{erroCep}</p>}
        {endereco && (
          <p className="full anuncio-endereco-confirmado">
            {endereco.logradouro && `${endereco.logradouro} · `}
            {endereco.bairro}, {endereco.cidade}/{endereco.uf}
          </p>
        )}

        <label>
          Raio de atendimento (km)
          <input
            type="number"
            min={1}
            max={100}
            value={raioKm}
            onChange={(evento) => setRaioKm(Number(evento.target.value))}
          />
        </label>

        <button type="submit" disabled={salvando}>
          {salvando ? 'Salvando…' : 'Salvar anúncio'}
        </button>
      </form>

      {anuncio?.anuncio && (
        <div className="signup-form anuncio-status">
          <p>
            Status: <strong>{anuncio.anuncio.ativo ? 'Publicado' : 'Não publicado'}</strong>
          </p>
          {erroAtivo && <p className="form-alerta">{erroAtivo}</p>}
          <button type="button" className="secondary-button" onClick={aoAlternarAtivo} disabled={alternandoAtivo}>
            {alternandoAtivo ? 'Atualizando…' : anuncio.anuncio.ativo ? 'Despublicar anúncio' : 'Publicar anúncio'}
          </button>
        </div>
      )}
    </div>
  )
}
