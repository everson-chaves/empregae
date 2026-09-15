import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  cadastrar,
  validarConfirmacaoSenha,
  validarEmail,
  validarNome,
  validarSenha,
} from '../lib/auth'
import { ErroDeAplicacao } from '../lib/erros'

type Campo = 'nome' | 'email' | 'senha' | 'confirmacao'

// T01.1 — Cadastro por e-mail e senha.
//
// Sem escolha de cliente/profissional/ambos e sem consentimento LGPD — isso
// é a T01.6 (Onboarding), que roda depois deste formulário. Aqui é só criar
// a conta: nome, e-mail, senha.
export default function Cadastrar() {
  const navegar = useNavigate()

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')

  const [erros, setErros] = useState<Partial<Record<Campo, string>>>({})
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [precisaConfirmarEmail, setPrecisaConfirmarEmail] = useState(false)

  function validarTudo(): boolean {
    const proximosErros: Partial<Record<Campo, string>> = {
      nome: validarNome(nome) ?? undefined,
      email: validarEmail(email) ?? undefined,
      senha: validarSenha(senha) ?? undefined,
      confirmacao: validarConfirmacaoSenha(senha, confirmacao) ?? undefined,
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
      const resultado = await cadastrar({ nome, email, senha })
      if (resultado.precisaConfirmarEmail) {
        setPrecisaConfirmarEmail(true)
      } else {
        navegar('/')
      }
    } catch (erro) {
      setErroGeral(erro instanceof ErroDeAplicacao ? erro.message : 'Algo deu errado. Tente de novo.')
    } finally {
      setEnviando(false)
    }
  }

  if (precisaConfirmarEmail) {
    return (
      <div className="auth-page">
        <div className="signup-form">
          <h1>Quase lá</h1>
          <p className="form-aviso">
            Enviamos um e-mail de confirmação para <strong>{email}</strong>. Abra sua caixa
            de entrada e clique no link para ativar a conta.
            <br />
            (Em desenvolvimento local, o e-mail cai no Mailpit — veja
            docs/setup-ambiente.md.)
          </p>
          <p className="auth-rodape">
            <Link to="/entrar">Já confirmei, entrar</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <form className="signup-form" onSubmit={aoEnviar} noValidate>
        <h1>Criar conta</h1>
        <p className="auth-subtitulo">Leva menos de um minuto.</p>

        {erroGeral && <p className="form-alerta">{erroGeral}</p>}

        <label className="full">
          Nome
          <input
            type="text"
            autoComplete="name"
            value={nome}
            onChange={(evento) => setNome(evento.target.value)}
            aria-invalid={Boolean(erros.nome)}
          />
        </label>
        {erros.nome && <p className="campo-erro full">{erros.nome}</p>}

        <label className="full">
          E-mail
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(evento) => setEmail(evento.target.value)}
            aria-invalid={Boolean(erros.email)}
          />
        </label>
        {erros.email && <p className="campo-erro full">{erros.email}</p>}

        <label className="full">
          Senha
          <input
            type="password"
            autoComplete="new-password"
            value={senha}
            onChange={(evento) => setSenha(evento.target.value)}
            aria-invalid={Boolean(erros.senha)}
          />
        </label>
        {erros.senha && <p className="campo-erro full">{erros.senha}</p>}

        <label className="full">
          Confirmar senha
          <input
            type="password"
            autoComplete="new-password"
            value={confirmacao}
            onChange={(evento) => setConfirmacao(evento.target.value)}
            aria-invalid={Boolean(erros.confirmacao)}
          />
        </label>
        {erros.confirmacao && <p className="campo-erro full">{erros.confirmacao}</p>}

        <button type="submit" disabled={enviando}>
          {enviando ? 'Criando conta…' : 'Criar conta'}
        </button>

        <p className="auth-rodape">
          Já tem conta? <Link to="/entrar">Entrar</Link>
        </p>
      </form>
    </div>
  )
}
