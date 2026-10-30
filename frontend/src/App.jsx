// Hemare - Rotas do site.
import Clima from './paginas/Clima';
import Radar from './paginas/Radar';
import Agendar from './paginas/Agendar';
import PerfilHospital from './paginas/PerfilHospital';
import { PORTOES } from './regras/portoes';
import MinhasDoacoes from './paginas/MinhasDoacoes';
import VLibras from './componentes/VLibras';
import Estoque from './paginas/Estoque';
import Placar from './paginas/Placar';
import Apadrinhar from './paginas/Apadrinhar';
import Campanha from './paginas/Campanha';
import Noticias from './paginas/Noticias';
import MeuPerfil from './paginas/MeuPerfil';
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
          {/* Telas abertas ao publico e ao doador: hospital e administrador logados vao para a propria area. */}
          <Route index element={<RotaProtegida papeis={['doador']} permitirVisitante><Inicio /></RotaProtegida>} />
          <Route path="login" element={<Login />} />
          <Route path="cadastro" element={<RotaProtegida soVisitante><Cadastro /></RotaProtegida>} />
          <Route path="triagem" element={<RotaProtegida papeis={['doador']} portao={PORTOES.triagem}><Triagem /></RotaProtegida>} />
          <Route path="locais" element={<RotaProtegida papeis={['doador']} permitirVisitante><Locais /></RotaProtegida>} />
          <Route path="orientacoes" element={<RotaProtegida papeis={['doador']} permitirVisitante><Orientacoes /></RotaProtegida>} />
          <Route path="mitos" element={<RotaProtegida papeis={['doador']} permitirVisitante><Mitos /></RotaProtegida>} />
          <Route path="direitos" element={<RotaProtegida papeis={['doador']} permitirVisitante><Direitos /></RotaProtegida>} />
          <Route path="area-doador" element={<RotaProtegida papeis={['doador']}><AreaDoador /></RotaProtegida>} />
          <Route path="meu-perfil" element={<RotaProtegida papeis={['doador']}><MeuPerfil /></RotaProtegida>} />
          <Route path="completar-perfil" element={<RotaProtegida papeis={['doador']}><CompletarPerfil /></RotaProtegida>} />
          <Route path="cadastro-hospital" element={<RotaProtegida soVisitante><CadastroHospital /></RotaProtegida>} />
          <Route path="painel-hospital" element={<RotaProtegida papeis={['hospital']}><PainelHospital /></RotaProtegida>} />
          <Route path="perfil-hospital" element={<RotaProtegida papeis={['hospital']}><PerfilHospital /></RotaProtegida>} />
          <Route path="recuperar-senha" element={<RotaProtegida soVisitante><RecuperarSenha /></RotaProtegida>} />
          <Route path="estoque" element={<Estoque />} />
          <Route path="placar" element={<Placar />} />
          <Route path="apadrinhar" element={<RotaProtegida papeis={['doador']} portao={PORTOES.apadrinhar}><Apadrinhar /></RotaProtegida>} />
          <Route path="campanha/:codigo" element={<Campanha />} />
          <Route path="noticias" element={<Noticias />} />
          <Route path="admin" element={<RotaProtegida papeis={['admin']}><PainelAdmin /></RotaProtegida>} />
          <Route path="radar" element={<RotaProtegida papeis={['hospital', 'admin']}><Radar /></RotaProtegida>} />
          <Route path="agendar" element={<RotaProtegida papeis={['doador']}><Agendar /></RotaProtegida>} />
          <Route path="minhas-doacoes" element={<RotaProtegida papeis={['doador']}><MinhasDoacoes /></RotaProtegida>} />
          <Route path="clima" element={<Clima />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;