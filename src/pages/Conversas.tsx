import EmConstrucao from '../components/EmConstrucao'

export default function Conversas() {
  return (
    <EmConstrucao
      titulo="Minhas conversas"
      epic="E04 — Chat"
      dono="Dev C"
      issue={42}
      descricao="Lista ordenada por atividade, com contador de não lidas."
    />
  )
}
