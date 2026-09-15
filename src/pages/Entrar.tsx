import { type FormEvent, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { entrar, validarIdentificador, validarSenha } from '../lib/auth'
import { ErroDeAplicacao } from '../lib/erros'

type Campo = 'identificador' | 'senha'

type EstadoDeOrigem = { de?: string }

// T01.1 — Login por e-mail e senha.
// T01.2 — O mesmo campo aceita telefone também (sem SMS, mapeado por baixo
// dos panos para um e-mail sintético — ver src/lib/auth.ts). Um campo só,
// sem seletor: quem já sabe o que digitou não precisa escolher o tipo antes.
export default function Entrar() {
  const navegar = useNavigate()
  const local = useLocation()
  // Quando a RotaProtegida (T01.3) manda pra cá, ela guarda de onde veio em
  // `state.de` — login bem-sucedido volta pra lá em vez de sempre cair na
  // home. Sem isto, clicar num link protegido e logar te joga pra "/" e você
  // perde o que estava tentando abrir.
  const destinoAposLogin = (local.state as EstadoDeOrigem | null)?.de ?? '/'

  const [identificador, setIdentificador] = useState('')
  const [senha, setSenha] = useState('')

  const [erros, setErros] = useState<Partial<Record<Campo, string>>>({})
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  function validarTudo(): boolean {
    const proximosErros: Partial<Record<Campo, string>> = {
      identificador: validarIdentificador(identificador) ?? undefined,
      senha: validarSenha(senha) ?? undefined,
    }
    setErros(proximosErros)
    return Object.values(proximosErros).every((mensagem) => !mensagem)
  }

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault()
    setErroGeral(null)

    if (!validarTudo()) return

    setEnviando(true)
    try {
      await entrar({ identificador, senha })
      navegar(destinoAposLogin, { replace: true })
    } catch (erro) {
      setErroGeral(erro instanceof ErroDeAplicacao ? erro.message : 'Algo deu errado. Tente de novo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="auth-page">
      <form className="signup-form" onSubmit={aoEnviar} noValidate>
        <h1>Entrar</h1>
        <p className="auth-subtitulo">Bom te ver de novo.</p>

        {erroGeral && <p className="form-alerta">{erroGeral}</p>}

        <label className="full">
          E-mail ou telefone
          <input
            type="text"
            autoComplete="username"
            value={identificador}
            onChange={(evento) => setIdentificador(evento.target.value)}
            aria-invalid={Boolean(erros.identificador)}
          />
        </label>
        {erros.identificador && <p className="campo-erro full">{erros.identificador}</p>}

        <label className="full">
          Senha
          <input
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(evento) => setSenha(evento.target.value)}
            aria-invalid={Boolean(erros.senha)}
          />
        </label>
        {erros.senha && <p className="campo-erro full">{erros.senha}</p>}

        <button type="submit" disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>

        <p className="auth-rodape">
          Ainda não tem conta? <Link to="/cadastrar">Criar conta</Link>
        </p>
      </form>
    </div>
  )
}
