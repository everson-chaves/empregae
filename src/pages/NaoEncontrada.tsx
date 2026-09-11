import { Link } from 'react-router-dom'

export default function NaoEncontrada() {
  return (
    <section className="app-layout" style={{ gridTemplateColumns: '1fr' }}>
      <article className="sidebar" style={{ position: 'static', maxWidth: 520 }}>
        <p className="eyebrow">Erro 404</p>
        <h2>Essa página não existe</h2>
        <p>O endereço que você abriu não corresponde a nenhuma página do Empregaê.</p>
        <p style={{ marginTop: 18 }}>
          <Link className="ghost-button" style={{ display: 'inline-flex', padding: '0 16px' }} to="/">
            Voltar para a busca
          </Link>
        </p>
      </article>
    </section>
  )
}
