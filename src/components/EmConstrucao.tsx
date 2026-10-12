// Marcador temporário das páginas ainda não implementadas.
//
// Cada página do shell nasce apontando para a issue e o dono dela, para que
// quem abrir o arquivo saiba de cara se aquilo é da sua trilha. Some conforme
// as epics vão sendo executadas — quando este componente não tiver mais
// nenhum uso, o E00 cumpriu o papel dele.
type Props = {
  titulo: string
  epic: string
  dono: string
  issue: number
  descricao: string
}

export default function EmConstrucao({ titulo, epic, dono, issue, descricao }: Props) {
  return (
    <section className="app-layout" style={{ gridTemplateColumns: '1fr' }}>
      <article className="sidebar" style={{ position: 'static', maxWidth: 620 }}>
        <p className="eyebrow">
          {epic} · {dono}
        </p>
        <h2>{titulo}</h2>
        <p>{descricao}</p>
        <p style={{ marginTop: 18 }}>
          <a
            className="ghost-button"
            style={{ display: 'inline-flex', alignItems: 'center', padding: '0 16px' }}
            href={`https://github.com/everson-chaves/empregae/issues/${issue}`}
            target="_blank"
            rel="noreferrer"
          >
            Abrir issue #{issue}
          </a>
        </p>
      </article>
    </section>
  )
}
