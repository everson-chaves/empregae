// T07.4 — Escopo declarado da verificação. Página pública (sem login):
// precisa estar acessível a quem está decidindo contratar, não só a quem já
// está logado. Existe por um motivo de responsabilidade, não só de
// transparência — ver docs/modelo-de-negocio.md ("Incidente com
// profissional que possui selo: escopo da verificação declarado
// explicitamente"). Dizer com precisão o que NÃO é checado é tão importante
// quanto dizer o que é.
export default function EscopoVerificacao() {
  return (
    <section className="app-layout" style={{ gridTemplateColumns: '1fr' }}>
      <article className="sidebar profile-detail" style={{ position: 'static', maxWidth: 680 }}>
        <p className="eyebrow">E07 — Verificação</p>
        <h2>O que o selo "Verificado" significa</h2>

        <p>
          O selo indica que o profissional passou por uma checagem pontual, feita pelo Empregaê, antes da data que
          aparece junto ao selo. Ele <strong>não</strong> é uma garantia contínua nem um atestado da qualidade do
          serviço prestado.
        </p>

        <h3 style={{ marginTop: 20 }}>O que É checado</h3>
        <ul>
          <li>Documento de identidade com foto, enviado pelo próprio profissional.</li>
          <li>Consulta de antecedentes, feita no momento da aprovação.</li>
          <li>
            O selo tem validade de até 1 ano a partir da aprovação — depois disso ele some do perfil e da busca
            automaticamente, até uma nova verificação.
          </li>
        </ul>

        <h3 style={{ marginTop: 20 }}>O que NÃO é checado</h3>
        <ul>
          <li>Nada acontece entre uma verificação e outra — não há monitoramento contínuo.</li>
          <li>Qualidade técnica, capacitação ou habilitação profissional para o serviço oferecido.</li>
          <li>Processos cíveis, dívidas ou histórico fora do escopo da consulta de antecedentes.</li>
          <li>Qualquer fato posterior à data de aprovação do selo.</li>
        </ul>

        <p style={{ marginTop: 20 }}>
          O selo reduz risco, não o elimina. A decisão de contratar continua sendo de quem contrata — use também as
          avaliações verificadas do perfil, que só existem depois de uma contratação concluída de verdade.
        </p>

        <p>Viu algo que te preocupa num profissional verificado? O perfil público dele tem um canal de denúncia direto.</p>
      </article>
    </section>
  )
}
