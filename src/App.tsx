import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Busca from './pages/Busca'
import PerfilProfissional from './pages/PerfilProfissional'
import MeuPerfil from './pages/MeuPerfil'
import Entrar from './pages/Entrar'
import Cadastrar from './pages/Cadastrar'
import Conversas from './pages/Conversas'
import Conversa from './pages/Conversa'
import Contratacoes from './pages/Contratacoes'
import Verificacao from './pages/Verificacao'
import Admin from './pages/Admin'
import NaoEncontrada from './pages/NaoEncontrada'
import Diagnostico from './pages/Diagnostico'

// As rotas espelham os módulos do spec, um arquivo por área. A divisão foi
// desenhada para que as quatro trilhas não disputem os mesmos arquivos:
// cada dev mexe nas páginas da sua epic e encosta aqui só para registrar rota.
export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Busca />} />

        {/* E01 — Dev A */}
        <Route path="entrar" element={<Entrar />} />
        <Route path="cadastrar" element={<Cadastrar />} />

        {/* E02 — Dev B */}
        <Route path="profissional/:id" element={<PerfilProfissional />} />
        <Route path="meu-perfil" element={<MeuPerfil />} />

        {/* E04 — Dev C */}
        <Route path="conversas" element={<Conversas />} />
        <Route path="conversas/:id" element={<Conversa />} />

        {/* E05 — Dev D */}
        <Route path="contratacoes" element={<Contratacoes />} />

        {/* E07 — Dev A */}
        <Route path="verificacao" element={<Verificacao />} />

        {/* E09 — Dev D */}
        <Route path="admin/*" element={<Admin />} />

        {/* E00 — ferramenta de desenvolvimento, fora do build de producao */}
        {import.meta.env.DEV && <Route path="diagnostico" element={<Diagnostico />} />}

        <Route path="*" element={<NaoEncontrada />} />
      </Route>
    </Routes>
  )
}
