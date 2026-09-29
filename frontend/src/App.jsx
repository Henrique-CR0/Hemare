// Hemare - Rotas do site.
import Clima from './paginas/Clima';
import Radar from './paginas/Radar';
import VLibras from './componentes/VLibras';
import Estoque from './paginas/Estoque';
import Placar from './paginas/Placar';
import Apadrinhar from './paginas/Apadrinhar';
import Campanha from './paginas/Campanha';
import PainelAdmin from './paginas/PainelAdmin';
import RecuperarSenha from './paginas/RecuperarSenha';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PainelHospital from './paginas/PainelHospital';
import CadastroHospital from './paginas/CadastroHospital';
import Layout from './componentes/Layout';
import RotaProtegida from './componentes/RotaProtegida';
import Inicio from './paginas/Inicio';
import Login from './paginas/Login';
import Cadastro from './paginas/Cadastro';
import Triagem from './paginas/Triagem';
import Locais from './paginas/Locais';
import AreaDoador from './paginas/AreaDoador';
import CompletarPerfil from './paginas/CompletarPerfil';
import Orientacoes from './paginas/Orientacoes';
import Mitos from './paginas/Mitos';
import Direitos from './paginas/Direitos';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <VLibras />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Inicio />} />
          <Route path="login" element={<Login />} />
          <Route path="cadastro" element={<Cadastro />} />
          <Route path="triagem" element={<Triagem />} />
          <Route path="locais" element={<Locais />} />
          <Route path="orientacoes" element={<Orientacoes />} />
          <Route path="mitos" element={<Mitos />} />
          <Route path="direitos" element={<Direitos />} />
          <Route path="area-doador" element={<RotaProtegida><AreaDoador /></RotaProtegida>} />
          <Route path="completar-perfil" element={<RotaProtegida><CompletarPerfil /></RotaProtegida>} />
          <Route path="cadastro-hospital" element={<CadastroHospital />} />
          <Route path="painel-hospital" element={<RotaProtegida><PainelHospital /></RotaProtegida>} />
          <Route path="recuperar-senha" element={<RecuperarSenha />} />
          <Route path="estoque" element={<Estoque />} />
          <Route path="placar" element={<Placar />} />
          <Route path="apadrinhar" element={<Apadrinhar />} />
          <Route path="campanha/:codigo" element={<Campanha />} />
          <Route path="admin" element={<RotaProtegida><PainelAdmin /></RotaProtegida>} />
          <Route path="radar" element={<RotaProtegida><Radar /></RotaProtegida>} />
          <Route path="clima" element={<Clima />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;