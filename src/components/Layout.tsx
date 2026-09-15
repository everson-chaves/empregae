import { Link, useNavigate, Outlet } from 'react-router-dom'
import { sair, useSessao } from '../lib/auth'

// Casca comum a todas as páginas. Usa as classes do CSS legado (`topbar`,
// `brand`, `nav-actions`), que foi preservado integralmente — o visual do
// protótipo continua valendo, só a marcação passou para React.
//
// A troca "Entrar" ⇄ "Sair" é o único jeito de a T01.1 ser testável de ponta
// a ponta pela UI. Redirecionar rota protegida (quem não pode ver o quê) é
// da T01.3 — aqui é só exibição do estado de sessão.
export default function Layout() {
  const { sessao, carregando } = useSessao()
  const navegar = useNavigate()

  async function aoSair() {
    await sair()
    navegar('/')
  }

  return (
    <>
      <header className="topbar">
        <Link to="/" className="brand">
          <img
            className="brand-logo"
            src="/assets/logo-empregae.svg"
            alt="Empregaê"
            width={42}
            height={42}
          />
          <span>
            <strong>Empregaê</strong>
            <small>o classificado de serviços do bairro</small>
          </span>
        </Link>

        <nav className="nav-actions">
          <Link to="/conversas">Conversas</Link>
          <Link to="/meu-perfil">Meu perfil</Link>
          {!carregando &&
            (sessao ? (
              <button type="button" className="ghost-button" onClick={aoSair}>
                Sair
              </button>
            ) : (
              <Link to="/entrar">Entrar</Link>
            ))}
        </nav>
      </header>

      <main>
        <Outlet />
      </main>
    </>
  )
}
