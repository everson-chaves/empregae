import { Link, Outlet } from 'react-router-dom'

// Casca comum a todas as páginas. Usa as classes do CSS legado (`topbar`,
// `brand`, `nav-actions`), que foi preservado integralmente — o visual do
// protótipo continua valendo, só a marcação passou para React.
export default function Layout() {
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
          <Link to="/entrar">Entrar</Link>
        </nav>
      </header>

      <main>
        <Outlet />
      </main>
    </>
  )
}
