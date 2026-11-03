import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { pareceTelefone } from '../lib/telefone'
import { solicitarRecuperacaoSenha, validarEmail } from '../lib/auth'
import { ErroDeAplicacao } from '../lib/erros'

// T01.4 — Recuperação de senha.
//
// Aceita o mesmo campo único de e-mail ou telefone que o login (T01.2), mas
// o caminho diverge assim que a pessoa envia: e-mail segue para o Supabase
// de verdade; telefone para numa mensagem explicando a limitação, sem
// tentar nenhuma chamada de rede — não existe link de recuperação possível
// para um e-mail sintético que ninguém lê (ver docs/recuperacao-senha.md).
export default function EsqueciSenha() {
  const [identificador, setIdentificador] = useState('')
  const [erroCampo, setErroCampo] = useState<string | null>(null)
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [ehTelefone, setEhTelefone] = useState(false)

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault()
    setErroGeral(null)
    setErroCampo(null)

    const limpo = identificador.trim()
    if (!limpo) {
      setErroCampo('Digite seu e-mail ou telefone.')
      return
    }

    if (pareceTelefone(limpo)) {
      // Sem viagem de rede: não há nada que o servidor possa fazer aqui.
      setEhTelefone(true)
      setEnviado(true)
      return
    }

    const erroDeEmail = validarEmail(limpo)
    if (erroDeEmail) {
      setErroCampo(erroDeEmail)
      return
    }

    setEnviando(true)
    try {
      await solicitarRecuperacaoSenha(limpo)
      setEhTelefone(false)
      setEnviado(true)
    } catch (erro) {
      setErroGeral(erro instanceof ErroDeAplicacao ? erro.message : 'Algo deu errado. Tente de novo.')
    } finally {
      setEnviando(false)
    }
  }

  if (enviado) {
    return (
      <div className="auth-page">
        <div className="signup-form">
          <h1>{ehTelefone ? 'Ainda não dá por telefone' : 'Verifique seu e-mail'}</h1>
          {ehTelefone ? (
            <p className="form-aviso">
              Contas cadastradas por telefone ainda não têm recuperação automática de senha —
              isso exigiria enviar SMS, e o Empregaê não usa SMS por enquanto. Fale com a nossa
              equipe para redefinir sua senha manualmente.
            </p>
          ) : (
            <p className="form-aviso">
              Se <strong>{identificador.trim()}</strong> tiver uma conta com a gente, enviamos um
              link para redefinir a senha. Abra sua caixa de entrada e clique no link.
              <br />
              (Em desenvolvimento local, o e-mail cai no Mailpit — veja docs/setup-ambiente.md.)
            </p>
          )}
          <p className="auth-rodape">
            <Link to="/entrar">Voltar para entrar</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <form className="signup-form" onSubmit={aoEnviar} noValidate>
        <h1>Esqueci minha senha</h1>
        <p className="auth-subtitulo">
          Digite o e-mail da sua conta e mandamos um link para você escolher uma senha nova.
        </p>

        {erroGeral && <p className="form-alerta">{erroGeral}</p>}

        <label className="full">
          E-mail ou telefone
          <input
            type="text"
            autoComplete="username"
            value={identificador}
            onChange={(evento) => setIdentificador(evento.target.value)}
            aria-invalid={Boolean(erroCampo)}
          />
        </label>
        {erroCampo && <p className="campo-erro full">{erroCampo}</p>}

        <button type="submit" disabled={enviando}>
          {enviando ? 'Enviando…' : 'Enviar link'}
        </button>

        <p className="auth-rodape">
          <Link to="/entrar">Voltar para entrar</Link>
        </p>
      </form>
    </div>
  )
}
