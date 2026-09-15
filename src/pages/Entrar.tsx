import EmConstrucao from '../components/EmConstrucao'

export default function Entrar() {
  return (
    <EmConstrucao
      titulo="Entrar"
      epic="E01 — Autenticação"
      dono="Dev A"
      issue={22}
      descricao="Login por e-mail e senha. A T01.2 adiciona o telefone como identificador alternativo, sem SMS."
    />
  )
}
