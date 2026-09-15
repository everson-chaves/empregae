import EmConstrucao from '../components/EmConstrucao'

export default function Cadastrar() {
  return (
    <EmConstrucao
      titulo="Criar conta"
      epic="E01 — Autenticação"
      dono="Dev A"
      issue={22}
      descricao="Cadastro com escolha entre cliente, profissional ou ambos, e consentimento LGPD explícito."
    />
  )
}
