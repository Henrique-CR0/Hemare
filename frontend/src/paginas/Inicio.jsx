// Hemare - Landing: muitos baloes de tipo sanguineo subindo e fugindo do mouse.
import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';

const TIPOS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
const QUANTIDADE = 22;
const RAIO = 130;
const FORCA = 80;

function novoBalao(id, comecarEmBaixo) {
  return {
    id,
    tipo: TIPOS[Math.floor(Math.random() * TIPOS.length)],
    x: Math.random() * 100,
    y: comecarEmBaixo ? 105 + Math.random() * 30 : Math.random() * 100,
    tam: 34 + Math.random() * 34,
    vel: 0.08 + Math.random() * 0.14,
    fx: 0, fy: 0
  };
}

function Inicio() {
  const heroRef = useRef(null);
  const mouse = useRef({ x: -9999, y: -9999 });
  const [baloes, setBaloes] = useState(() =>
    Array.from({ length: QUANTIDADE }, (_, i) => novoBalao(i, false))
  );

  useEffect(() => {
    let frame;
    let proximoId = QUANTIDADE;

    function animar() {
      const rect = heroRef.current ? heroRef.current.getBoundingClientRect() : null;

      setBaloes((atuais) => atuais.map((b) => {
        let y = b.y - b.vel;
        let novo = { ...b, y };

        if (y < -15) {
          return novoBalao(proximoId++, true);
        }

        if (rect) {
          const bx = (b.x / 100) * rect.width;
          const by = (b.y / 100) * rect.height;
          const dx = bx - mouse.current.x;
          const dy = by - mouse.current.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist < RAIO) {
            const f = (1 - dist / RAIO) * FORCA;
            novo.fx = (dx / dist) * f;
            novo.fy = (dy / dist) * f;
          } else {
            novo.fx = b.fx * 0.85;
            novo.fy = b.fy * 0.85;
          }
        }
        return novo;
      }));

      frame = requestAnimationFrame(animar);
    }

    frame = requestAnimationFrame(animar);
    return () => cancelAnimationFrame(frame);
  }, []);

  function aoMover(e) {
    const rect = heroRef.current.getBoundingClientRect();
    mouse.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
  function aoSair() {
    mouse.current = { x: -9999, y: -9999 };
  }

  return (
    <div className="landing">
      <section className="landing-hero" ref={heroRef} onMouseMove={aoMover} onMouseLeave={aoSair}>
        <div className="baloes">
          {baloes.map((b) => (
            <div
              key={b.id}
              className="balao"
              style={{
                left: b.x + '%',
                top: b.y + '%',
                width: b.tam, height: b.tam,
                fontSize: Math.max(11, b.tam * 0.28),
                transform: `translate(${b.fx}px, ${b.fy}px)`
              }}
            >
              {b.tipo}
            </div>
          ))}
        </div>

        <div className="hero-conteudo">
          <span className="hero-pill">❤️ Doar sangue é doar vida</span>
          <h1>Sua doação pode<br />salvar <span>até 4 vidas</span></h1>
          <p>O Hemare conecta você a hospitais e hemocentros que precisam de sangue. Descubra se pode doar e encontre onde doar pertinho de você.</p>
          <div className="hero-cta">
            <Link to="/cadastro" className="cta-branco">Quero doar sangue</Link>
            <Link to="/triagem" className="cta-vazado">Será que posso doar?</Link>
          </div>
        </div>
      </section>

      <section className="landing-cards">
        <div className="lcard"><div className="lcard-ic">🩸</div><h3>Compatibilidade</h3><p>Achamos os doadores certos para cada tipo sanguíneo, na hora que mais importa.</p></div>
        <div className="lcard"><div className="lcard-ic">🏥</div><h3>Onde doar</h3><p>Encontre hemocentros e hospitais perto de você, em todo o Brasil.</p></div>
        <div className="lcard"><div className="lcard-ic">💛</div><h3>Vire um herói</h3><p>Acompanhe suas doações, ganhe emblemas e inspire mais gente a doar.</p></div>
      </section>
    </div>
  );
}

export default Inicio;