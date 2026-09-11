import EmConstrucao from '../components/EmConstrucao'

export default function Busca() {
  return (
    <EmConstrucao
      titulo="Busca por profissionais"
      epic="E03 — Busca geográfica"
      dono="Dev B"
      issue={34}
      descricao="Busca por raio com PostGIS. A RPC nunca retorna a coordenada do profissional: só a distância já calculada no servidor."
    />
  )
}
