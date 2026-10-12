import { type FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  buscarEnderecoPorCep,
  buscarProfissionais,
  formatarDistancia,
  geocodificarEndereco,
  pedirAvisoDeBusca,
  registrarBuscaLog,
  useAutocompleteEndereco,
  type ResultadoBusca,
} from '../lib/busca'
import { buscarCategorias, formatarPreco, type Categoria } from '../lib/anuncio'
import { ErroDeAplicacao } from '../lib/erros'

const LIMITE_POR_PAGINA = 20
const OPCOES_RAIO = [5, 10, 20, 50]

type Localizacao = { lat: number; lon: number; rotulo: string }
type EstadoBusca = 'ocioso' | 'buscando' | 'pronto' | 'erro'

// E03 — Busca por raio (T03.1 RPC, T03.3 autocomplete, T03.4 resultados,
// T03.5 estado vazio, T03.6 telemetria).
//
// O ponto de partida é sempre a localização de QUEM BUSCA (endereço digitado,
// CEP ou geolocalização do navegador) — nunca a de um profissional. A RPC
// (lib/busca.ts) filtra pelo raio de atendimento de cada profissional, então
// "raio" aqui embaixo é só um filtro OPCIONAL do lado do cliente.
export default function Busca() {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [categoriaSlug, setCategoriaSlug] = useState('')
  const [raioMaximoKm, setRaioMaximoKm] = useState('')

  const [textoEndereco, setTextoEndereco] = useState('')
  const { sugestoes, buscando: buscandoSugestoes } = useAutocompleteEndereco(textoEndereco)
  const [mostrarCep, setMostrarCep] = useState(false)
  const [cep, setCep] = useState('')
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [erroLocalizacao, setErroLocalizacao] = useState<string | null>(null)
  const [buscandoGeolocalizacao, setBuscandoGeolocalizacao] = useState(false)

  const [localizacao, setLocalizacao] = useState<Localizacao | null>(null)
  const [estado, setEstado] = useState<EstadoBusca>('ocioso')
  const [resultados, setResultados] = useState<ResultadoBusca[]>([])
  const [pagina, setPagina] = useState(0)
  const [temMais, setTemMais] = useState(false)
  const [erroBusca, setErroBusca] = useState<string | null>(null)

  const [emailAviso, setEmailAviso] = useState('')
  const [avisoEnviado, setAvisoEnviado] = useState(false)
  const [erroAviso, setErroAviso] = useState<string | null>(null)

  useEffect(() => {
    buscarCategorias()
      .then(setCategorias)
      .catch(() => {
        // Filtro de categoria é acessório: se o catálogo não carregar, a
        // busca por raio ainda funciona sem filtro.
      })
  }, [])

  function escolherSugestao(rotulo: string, lat: number, lon: number) {
    setLocalizacao({ lat, lon, rotulo })
    setTextoEndereco(rotulo)
    setErroLocalizacao(null)
  }

  async function aoBuscarPorCep() {
    setErroLocalizacao(null)
    setBuscandoCep(true)
    try {
      const endereco = await buscarEnderecoPorCep(cep)
      const enderecoTexto = [endereco.logradouro, endereco.bairro, endereco.cidade, endereco.uf, 'Brasil']
        .filter(Boolean)
        .join(', ')
      const coordenada = await geocodificarEndereco(enderecoTexto)
      if (!coordenada) {
        setErroLocalizacao('Não conseguimos localizar esse CEP no mapa. Tente um endereço por extenso.')
        return
      }
      const rotulo = `${endereco.bairro}, ${endereco.cidade}/${endereco.uf}`
      setLocalizacao({ lat: coordenada.lat, lon: coordenada.lon, rotulo })
      setTextoEndereco(rotulo)
    } catch (erro) {
      setErroLocalizacao(erro instanceof ErroDeAplicacao ? erro.message : 'Não foi possível buscar o CEP.')
    } finally {
      setBuscandoCep(false)
    }
  }

  function usarLocalizacaoAtual() {
    if (!navigator.geolocation) {
      setErroLocalizacao('Seu navegador não oferece geolocalização. Digite o endereço ou o CEP.')
      return
    }
    setErroLocalizacao(null)
    setBuscandoGeolocalizacao(true)
    navigator.geolocation.getCurrentPosition(
      (posicao) => {
        setLocalizacao({
          lat: posicao.coords.latitude,
          lon: posicao.coords.longitude,
          rotulo: 'Sua localização atual',
        })
        setTextoEndereco('Sua localização atual')
        setBuscandoGeolocalizacao(false)
      },
      () => {
        setErroLocalizacao('Não conseguimos acessar sua localização. Digite o endereço ou o CEP.')
        setBuscandoGeolocalizacao(false)
      },
      { timeout: 10_000 },
    )
  }

  async function executarBusca(offset: number, substituir: boolean) {
    if (!localizacao) {
      setErroLocalizacao('Diga onde você está pra começar a busca.')
      return
    }
    setErroBusca(null)
    setEstado('buscando')
    try {
      const raio = raioMaximoKm ? Number(raioMaximoKm) : null
      const categoria = categoriaSlug || null
      const novosResultados = await buscarProfissionais({
        lat: localizacao.lat,
        lon: localizacao.lon,
        categoriaSlug: categoria,
        raioMaximoKm: raio,
        limite: LIMITE_POR_PAGINA,
        offset,
      })

      setResultados((atual) => (substituir ? novosResultados : [...atual, ...novosResultados]))
      setTemMais(novosResultados.length === LIMITE_POR_PAGINA)
      setEstado('pronto')

      if (substituir) {
        void registrarBuscaLog({
          lat: localizacao.lat,
          lon: localizacao.lon,
          raioMaximoKm: raio,
          categoriaSlug: categoria,
          numeroResultados: novosResultados.length,
        })
      }
    } catch (erro) {
      setErroBusca(erro instanceof ErroDeAplicacao ? erro.message : 'Não foi possível buscar agora. Tente de novo.')
      setEstado('erro')
    }
  }

  function aoSubmeterBusca(evento: FormEvent) {
    evento.preventDefault()
    setPagina(0)
    setAvisoEnviado(false)
    void executarBusca(0, true)
  }

  function aoCarregarMais() {
    const proximaPagina = pagina + 1
    setPagina(proximaPagina)
    void executarBusca(proximaPagina * LIMITE_POR_PAGINA, false)
  }

  async function aoPedirAviso(evento: FormEvent) {
    evento.preventDefault()
    if (!localizacao) return
    setErroAviso(null)
    try {
      await pedirAvisoDeBusca({
        email: emailAviso,
        categoriaSlug: categoriaSlug || null,
        lat: localizacao.lat,
        lon: localizacao.lon,
      })
      setAvisoEnviado(true)
    } catch (erro) {
      setErroAviso(erro instanceof ErroDeAplicacao ? erro.message : 'Não foi possível registrar seu e-mail.')
    }
  }

  return (
    <section className="busca-pagina">
      <form onSubmit={aoSubmeterBusca} className="busca-form">
        <div className="address-field full">
          <label className="full">
            Onde você está?
            <input
              type="text"
              placeholder="Rua, bairro ou cidade"
              value={textoEndereco}
              onChange={(evento) => {
                setTextoEndereco(evento.target.value)
                setLocalizacao(null)
              }}
            />
          </label>
          {(sugestoes.length > 0 || buscandoSugestoes) && !localizacao && (
            <div className="suggestions">
              {sugestoes.map((sugestao) => (
                <button
                  key={`${sugestao.lat}-${sugestao.lon}`}
                  type="button"
                  className="suggestion-button"
                  onClick={() => escolherSugestao(sugestao.rotulo, sugestao.lat, sugestao.lon)}
                >
                  <span>{sugestao.rotulo}</span>
                </button>
              ))}
            </div>
          )}
          {localizacao && <p className="location-preview">📍 {localizacao.rotulo}</p>}
        </div>

        <div className="full" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" className="secondary-button" onClick={usarLocalizacaoAtual} disabled={buscandoGeolocalizacao}>
            {buscandoGeolocalizacao ? 'Localizando…' : 'Usar minha localização'}
          </button>
          <button type="button" className="ghost-button" onClick={() => setMostrarCep((atual) => !atual)}>
            {mostrarCep ? 'Buscar por endereço' : 'Prefiro buscar pelo CEP'}
          </button>
        </div>

        {mostrarCep && (
          <div className="full anuncio-cep-linha">
            <input
              type="text"
              inputMode="numeric"
              placeholder="00000-000"
              value={cep}
              onChange={(evento) => setCep(evento.target.value)}
            />
            <button type="button" className="secondary-button" onClick={aoBuscarPorCep} disabled={buscandoCep}>
              {buscandoCep ? 'Buscando…' : 'Buscar'}
            </button>
          </div>
        )}

        {erroLocalizacao && <p className="campo-erro full">{erroLocalizacao}</p>}

        <select value={categoriaSlug} onChange={(evento) => setCategoriaSlug(evento.target.value)}>
          <option value="">Todas as categorias</option>
          {categorias.map((categoria) => (
            <option key={categoria.id} value={categoria.slug}>
              {categoria.nome}
            </option>
          ))}
        </select>

        <select value={raioMaximoKm} onChange={(evento) => setRaioMaximoKm(evento.target.value)}>
          <option value="">Qualquer distância</option>
          {OPCOES_RAIO.map((km) => (
            <option key={km} value={km}>
              Até {km} km
            </option>
          ))}
        </select>

        <button type="submit" className="full" disabled={estado === 'buscando'}>
          {estado === 'buscando' ? 'Buscando…' : 'Buscar'}
        </button>
      </form>

      {erroBusca && <p className="form-alerta">{erroBusca}</p>}

      {estado === 'pronto' && resultados.length === 0 && (
        <div className="empty-state">
          <h3>Ainda não tem profissional nessa área</h3>
          <p>
            A oferta no seu bairro está começando. Deixe seu e-mail e avisamos assim que alguém se
            cadastrar por aqui.
          </p>
          {avisoEnviado ? (
            <p className="form-aviso">Combinado — te avisamos.</p>
          ) : (
            <form onSubmit={aoPedirAviso} style={{ display: 'flex', gap: 8 }}>
              <input
                type="email"
                required
                placeholder="seu@email.com"
                value={emailAviso}
                onChange={(evento) => setEmailAviso(evento.target.value)}
              />
              <button type="submit">Avisar</button>
            </form>
          )}
          {erroAviso && <p className="campo-erro">{erroAviso}</p>}
        </div>
      )}

      {resultados.length > 0 && (
        <div>
          <div className="workers-grid">
            {resultados.map((resultado) => (
              <Link
                key={resultado.workerProfileId}
                to={`/profissional/${resultado.profileId}`}
                className="worker-card"
              >
                <div className="worker-top">
                  <div className="avatar">
                    {resultado.avatarUrl ? (
                      <img className="avatar-img" src={resultado.avatarUrl} alt="" />
                    ) : (
                      <span className="avatar-fallback">{resultado.nome.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div>
                    <h3>{resultado.nome}</h3>
                    <p>
                      {resultado.bairro}, {resultado.cidade}/{resultado.uf} ·{' '}
                      {formatarDistancia(resultado.distanciaKm)}
                    </p>
                  </div>
                </div>
                <div className="tag-row">
                  {resultado.precoMedioCentavos !== null && resultado.unidadePreco && (
                    <span className="tag">{formatarPreco(resultado.precoMedioCentavos, resultado.unidadePreco)}</span>
                  )}
                  {resultado.categorias.slice(0, 2).map((nome) => (
                    <span key={nome} className="tag tag-match">
                      {nome}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>

          {temMais && (
            <p style={{ textAlign: 'center', marginTop: 16 }}>
              <button type="button" className="secondary-button" onClick={aoCarregarMais} disabled={estado === 'buscando'}>
                {estado === 'buscando' ? 'Carregando…' : 'Carregar mais'}
              </button>
            </p>
          )}
        </div>
      )}
    </section>
  )
}
