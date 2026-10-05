// Hemare - Carteirinha digital do doador: um cartao desenhado no navegador (nada vai para o servidor)
// que a pessoa pode baixar como imagem e guardar no celular. Util em emergencias: tipo sanguineo e contato a mao.
import { useRef, useEffect, useState } from 'react';

const LARGURA = 680;
const ALTURA = 420;

function retanguloArredondado(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function texto(ctx, conteudo, x, y, tamanho, peso, cor, largura) {
  ctx.fillStyle = cor;
  ctx.font = peso + ' ' + tamanho + 'px "Segoe UI", Arial, sans-serif';
  ctx.fillText(conteudo, x, y, largura);
}

function desenhar(canvas, perfil, mostrarEmergencia, imagem) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, LARGURA, ALTURA);

  // Fundo
  retanguloArredondado(ctx, 0, 0, LARGURA, ALTURA, 28);
  const fundo = ctx.createLinearGradient(0, 0, LARGURA, ALTURA);
  fundo.addColorStop(0, '#e8112d');
  fundo.addColorStop(1, '#8a0a20');
  ctx.fillStyle = fundo;
  ctx.fill();
  ctx.save();
  retanguloArredondado(ctx, 0, 0, LARGURA, ALTURA, 28);
  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.beginPath(); ctx.arc(LARGURA - 40, 40, 190, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // Topo
  texto(ctx, '🩸 Hemare', 36, 52, 26, '800', '#ffffff');
  texto(ctx, 'CARTEIRINHA DO DOADOR', LARGURA - 36 - 230, 50, 14, '700', 'rgba(255,255,255,0.8)', 230);

  // Foto
  const cx = 36 + 70;
  const cy = 120 + 70;
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, 70, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
  ctx.fillStyle = '#ffe1e5';
  ctx.fillRect(cx - 70, cy - 70, 140, 140);
  if (imagem) {
    ctx.drawImage(imagem, cx - 70, cy - 70, 140, 140);
  } else {
    texto(ctx, '🩸', cx - 34, cy + 22, 68, '400', '#c8102e');
  }
  ctx.restore();
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(cx, cy, 70, 0, Math.PI * 2); ctx.stroke();

  // Nome e dados
  const nomeExibido = perfil.nomeSocial || perfil.nome;
  texto(ctx, nomeExibido, 200, 150, 30, '800', '#ffffff', 300);
  if (perfil.nomeSocial) texto(ctx, 'Nome civil: ' + perfil.nome, 200, 176, 14, '400', 'rgba(255,255,255,0.8)', 300);
  texto(ctx, perfil.nivel.icone + ' ' + perfil.nivel.nome, 200, 212, 18, '700', '#ffffff', 300);
  const doacoes = perfil.totalDoacoes + (perfil.totalDoacoes === 1 ? ' doação' : ' doações');
  const desde = perfil.doadorDesde ? ' · doador desde ' + perfil.doadorDesde.slice(5, 7) + '/' + perfil.doadorDesde.slice(0, 4) : '';
  texto(ctx, doacoes + desde, 200, 238, 15, '400', 'rgba(255,255,255,0.9)', 300);
  const local = [perfil.cidade, perfil.estado].filter(Boolean).join(' - ');
  if (local) texto(ctx, '📍 ' + local, 200, 262, 15, '400', 'rgba(255,255,255,0.9)', 300);

  // Tipo sanguineo
  const rotuloTipo = perfil.tipoSanguineo.startsWith('Rh nulo') ? 'Rh nulo' : perfil.tipoSanguineo;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(LARGURA - 36 - 66, 190, 66, 0, Math.PI * 2); ctx.fill();
  ctx.textAlign = 'center';
  texto(ctx, rotuloTipo, LARGURA - 36 - 66, 190 + (rotuloTipo.length > 3 ? 11 : 20), rotuloTipo.length > 3 ? 30 : 52, '800', '#c8102e', 112);
  texto(ctx, 'TIPO SANGUÍNEO', LARGURA - 36 - 66, 282, 11, '700', 'rgba(255,255,255,0.85)', 130);
  ctx.textAlign = 'left';

  // Rodape
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  retanguloArredondado(ctx, 20, ALTURA - 106, LARGURA - 40, 86, 18);
  ctx.fill();
  if (mostrarEmergencia && perfil.contatoEmergenciaNome && perfil.contatoEmergenciaTelefone) {
    texto(ctx, 'EM EMERGÊNCIA AVISAR', 40, ALTURA - 76, 12, '700', 'rgba(255,255,255,0.75)');
    texto(ctx, perfil.contatoEmergenciaNome + ' · ' + perfil.contatoEmergenciaTelefone, 40, ALTURA - 50, 20, '700', '#ffffff', LARGURA - 80);
  } else {
    texto(ctx, 'Doe sangue, salve até 4 vidas', 40, ALTURA - 56, 20, '700', '#ffffff', LARGURA - 80);
  }
  texto(ctx, 'Cartão informativo: não substitui exame nem documento oficial.', 40, ALTURA - 28, 11, '400', 'rgba(255,255,255,0.7)', LARGURA - 80);
}

function Carteirinha({ perfil }) {
  const canvasRef = useRef(null);
  const [mostrarEmergencia, setMostrarEmergencia] = useState(true);
  const temContato = !!(perfil.contatoEmergenciaNome && perfil.contatoEmergenciaTelefone);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    let ativo = true;
    if (perfil.foto) {
      const img = new Image();
      img.onload = () => ativo && desenhar(canvas, perfil, mostrarEmergencia, img);
      img.onerror = () => ativo && desenhar(canvas, perfil, mostrarEmergencia, null);
      img.src = perfil.foto;
    } else {
      desenhar(canvas, perfil, mostrarEmergencia, null);
    }
    return () => { ativo = false; };
  }, [perfil, mostrarEmergencia]);

  function baixar() {
    canvasRef.current.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'carteirinha-hemare.png';
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }

  return (
    <div className="cart">
      <canvas ref={canvasRef} width={LARGURA} height={ALTURA} className="cart-canvas"
              role="img" aria-label={'Carteirinha de doador de ' + (perfil.nomeSocial || perfil.nome) + ', tipo sanguíneo ' + perfil.tipoSanguineo} />
      <div className="cart-acoes">
        <button type="button" className="conq-btn" onClick={baixar}>⬇️ Baixar carteirinha (imagem)</button>
        {temContato && (
          <label className="cart-opcao">
            <input type="checkbox" checked={mostrarEmergencia} onChange={(e) => setMostrarEmergencia(e.target.checked)} />
            Mostrar o contato de emergência na carteirinha
          </label>
        )}
      </div>
      <p className="cart-aviso">A carteirinha é montada no seu aparelho: nada é enviado a ninguém. Se for compartilhar a imagem, lembre que ela mostra seu nome{temContato && mostrarEmergencia ? ' e o contato de emergência' : ''}.</p>
    </div>
  );
}

export default Carteirinha;
