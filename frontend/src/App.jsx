// Hemare - Rotas do site: cada URL leva a uma pagina, todas dentro do Layout.
import AreaDoador from './paginas/AreaDoador';
import CompletarPerfil from './paginas/CompletarPerfil';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './componentes/Layout';
import Inicio from './paginas/Inicio';
import Login from './paginas/Login';
import Cadastro from './paginas/Cadastro';
import Triagem from './paginas/Triagem';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Todas as paginas ficam "dentro" do Layout (com cabecalho e rodape) */}
        <Route path="/" element={<Layout />}>
        <Route path="area-doador" element={<AreaDoador />} />
          <Route path="completar-perfil" element={<CompletarPerfil />} />
          <Route index element={<Inicio />} />
          <Route path="login" element={<Login />} />
          <Route path="cadastro" element={<Cadastro />} />
          <Route path="triagem" element={<Triagem />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;