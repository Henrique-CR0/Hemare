// Hemare - Abas principais da conta: "Minha área" (o dia a dia) e o perfil (os dados da pessoa ou da instituição).
// Aparece no alto das telas de quem esta logado, para as duas coisas ficarem separadas e a um clique uma da outra.
import { NavLink } from 'react-router-dom';

const ABAS = {
  doador: [
    { para: '/area-doador', rotulo: '🏠 Minha área' },
    { para: '/meu-perfil', rotulo: '👤 Meu perfil' }
  ],
  hospital: [
    { para: '/painel-hospital', rotulo: '🏠 Minha área' },
    { para: '/perfil-hospital', rotulo: '🏥 Perfil do hospital' }
  ],
  admin: [
    { para: '/admin', rotulo: '🛡️ Hospitais e notícias' },
    { para: '/admin/status', rotulo: '📊 Status do desenvolvimento' }
  ]
};

function AbasConta({ tipo }) {
  const abas = ABAS[tipo] || [];
  return (
    <nav className="abas-conta" aria-label="Seções da minha conta">
      {abas.map((a) => (
        <NavLink key={a.para} to={a.para} end className={({ isActive }) => 'aba-conta' + (isActive ? ' aba-conta-ativa' : '')}>
          {a.rotulo}
        </NavLink>
      ))}
    </nav>
  );
}

export default AbasConta;
