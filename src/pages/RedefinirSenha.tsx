import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { redefinirSenha, useRecuperacaoDeSenha, validarConfirmacaoSenha, validarSenha } from '../lib/auth'
import { ErroDeAplicacao } from '../lib/erros'

type Campo = 'senha' | 'confirmacao'

// T01.4 — Tela que o link do e-mail de recuperação abre. useRecuperacaoDeSenha
// (lib/auth.ts) confirma que o link é um token de recuperação válido antes de
// deixar a pessoa trocar a senha — sem isso, alguém que só cola a URL sem o
// token veria um formulário que nunca vai funcionar.
export default function RedefinirSenha() {
  const estado = useRecuperacaoDeSenha()
  const navegar = useNavigate()

  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erros, setErros] = useState<Partial<Record<Campo, string>>>({})
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  function validarTudo(): boolean {
    const proximosErros: Partial<Record<Campo, string>> = {
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
      await redefinirSenha(senha)
      navegar('/entrar', { replace: true, state: { senhaRedefinida: true } })
    } catch (erro) {
      setErroGeral(erro instanceof ErroDeAplicacao ? erro.message : 'Algo deu errado. Tente de novo.')
    } finally {
      setEnviando(false)
    }
  }

  if (estado === 'carregando') return null

  if (estado === 'invalido') {
    return (
      <div className="auth-page">
        <div className="signup-form">
          <h1>Link inválido ou expirado</h1>
          <p className="form-aviso">
            Este link de redefinição de senha não é mais válido — links expiram depois de um
            tempo ou já foram usados. Peça um novo.
          </p>
          <p className="auth-rodape">
            <Link to="/esqueci-senha">Pedir novo link</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <form className="signup-form" onSubmit={aoEnviar} noValidate>
        <h1>Escolha uma senha nova</h1>

        {erroGeral && <p className="form-alerta">{erroGeral}</p>}

        <label className="full">
          Nova senha
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
          Confirmar senha nova
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
          {enviando ? 'Salvando…' : 'Salvar nova senha'}
        </button>
      </form>
    </div>
  )
}
