import EmConstrucao from '../components/EmConstrucao'

export default function Admin() {
  return (
    <EmConstrucao
      titulo="Painel administrativo"
      epic="E09 — Admin"
      dono="Dev D"
      issue={67}
      descricao="Moderação, fila de verificação e as métricas do piloto que alimentam a apresentação."
    />
  )
}
