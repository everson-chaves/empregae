import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  cadastrar,
  validarConfirmacaoSenha,
  validarEmail,
  validarNome,
  validarSenha,
  validarTelefone,
} from '../lib/auth'
import { ErroDeAplicacao } from '../lib/erros'

type Campo = 'nome' | 'identificador' | 'senha' | 'confirmacao'
type TipoIdentificador = 'email' | 'telefone'

// T01.1 — Cadastro por e-mail e senha.
// T01.2 — ... ou por telefone e senha (mapeado para e-mail sintético, sem
// SMS — ver src/lib/auth.ts). A escolha troca só o campo do meio; nome e
// senha são os mesmos nos dois caminhos.
//
// Sem escolha de cliente/profissional/ambos e sem consentimento LGPD — isso
// é a T01.6 (Onboarding), que roda depois deste formulário. Aqui é só criar
// a conta: nome, e-mail ou telefone, senha.
export default function Cadastrar() {
  const navegar = useNavigate()

  const [tipoIdentificador, setTipoIdentificador] = useState<TipoIdentificador>('email')
  const [nome, setNome] = useState('')
  const [identificador, setIdentificador] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')

  const [erros, setErros] = useState<Partial<Record<Campo, string>>>({})
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [precisaConfirmarEmail, setPrecisaConfirmarEmail] = useState(false)

  function trocarTipoIdentificador(tipo: TipoIdentificador) {
    // Troca o campo do meio sem carregar erro/valor do tipo anterior — um
    // telefone digitado não deveria aparecer como "e-mail inválido" se a
    // pessoa mudar de ideia e voltar para e-mail, e vice-versa.
    setTipoIdentificador(tipo)
    setIdentificador('')
    setErros((atual) => ({ ...atual, identificador: undefined }))
  }

  function validarTudo(): boolean {
    const validarIdent = tipoIdentificador === 'telefone' ? validarTelefone : validarEmail
    const proximosErros: Partial<Record<Campo, string>> = {
      nome: validarNome(nome) ?? undefined,
      identificador: validarIdent(identificador) ?? undefined,
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
      const resultado = await cadastrar({ nome, identificador, tipoIdentificador, senha })
      if (resultado.precisaConfirmarEmail) {
        setPrecisaConfirmarEmail(true)
      } else {
        // T01.6 — a sessão já veio pronta (telefone, ou e-mail com
        // confirmação desligada no projeto): manda direto para o
        // onboarding em vez de "/", em vez de deixar a pessoa completar
        // o consentimento LGPD só na próxima vez que tentar algo protegido.
        navegar('/onboarding')
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
            Enviamos um e-mail de confirmação para <strong>{identificador}</strong>. Abra sua
            caixa de entrada e clique no link para ativar a conta.
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

        <div className="full auth-toggle-identificador" role="group" aria-label="Cadastrar com">
          <button
            type="button"
            className={`category-button${tipoIdentificador === 'email' ? ' is-active' : ''}`}
            aria-pressed={tipoIdentificador === 'email'}
            onClick={() => trocarTipoIdentificador('email')}
          >
            E-mail
          </button>
          <button
            type="button"
            className={`category-button${tipoIdentificador === 'telefone' ? ' is-active' : ''}`}
            aria-pressed={tipoIdentificador === 'telefone'}
            onClick={() => trocarTipoIdentificador('telefone')}
          >
            Telefone
          </button>
        </div>

        {tipoIdentificador === 'email' ? (
          <label className="full">
            E-mail
            <input
              type="email"
              autoComplete="email"
              value={identificador}
              onChange={(evento) => setIdentificador(evento.target.value)}
              aria-invalid={Boolean(erros.identificador)}
            />
          </label>
        ) : (
          <label className="full">
            Telefone
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="11 91234-5678"
              value={identificador}
              onChange={(evento) => setIdentificador(evento.target.value)}
              aria-invalid={Boolean(erros.identificador)}
            />
          </label>
        )}
        {erros.identificador && <p className="campo-erro full">{erros.identificador}</p>}

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
