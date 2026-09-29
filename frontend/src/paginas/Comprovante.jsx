// Hemare - Comprovante de doacao verificavel (pagina publica, aberta pelo link ou QR code).
// Qualquer pessoa (ex.: o RH) confere na cadeia de confianca se a doacao e verdadeira.
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import QRCode from 'qrcode';
import { URL_BACKEND } from '../config';

// "2026-09-29T00:00:00.000Z" -> "29/09/2026" (usa so o dia, sem converter fuso).
function formatarData(texto) {
  const [ano, mes, dia] = String(texto).slice(0, 10).split('-');
  return dia + '/' + mes + '/' + ano;
}

function Comprovante() {
  const { hash } = useParams();
  const [dados, setDados] = useState(null);
  const [situacao, setSituacao] = useState('carregando'); // carregando | ok | nao-encontrado | erro
  const [qr, setQr] = useState('');

  useEffect(() => {
    let ativo = true;
    fetch(URL_BACKEND + '/comprovante/' + hash)
      .then(async (r) => {
        if (!ativo) return;
        if (r.status === 400 || r.status === 404) return setSituacao('nao-encontrado');
        if (!r.ok) return setSituacao('erro');
        const d = await r.json();
        if (!ativo) return;
        setDados(d);
        setSituacao('ok');
      })
      .catch(() => ativo && setSituacao('erro'));
    // QR code com o endereco desta mesma pagina (para imprimir e o RH conferir).
    QRCode.toDataURL(window.location.href, { width: 180, margin: 1 })
      .then((url) => ativo && setQr(url))
      .catch(() => {});
    return () => { ativo = false; };
  }, [hash]);

  if (situacao === 'carregando') {
    return <div className="compr"><p className="compr-vazio">Conferindo o comprovante na cadeia de confiança...</p></div>;
  }
  if (situacao === 'nao-encontrado') {
    return (
      <div className="compr">
        <div className="compr-cartao compr-invalido">
          <h1>✕ Comprovante não encontrado</h1>
          <p>Não existe doação registrada no Hemare com este código. Confira se o link ou o QR code está completo.</p>
        </div>
      </div>
    );
  }
  if (situacao === 'erro') {
    return <div className="compr"><p className="compr-vazio">Não foi possível conferir o comprovante agora. Tente de novo em instantes.</p></div>;
  }

  const { valido, doacao, codigo, registro } = dados;

  return (
    <div className="compr">
      <div className={'compr-cartao' + (valido ? ' compr-valido' : ' compr-invalido')}>
        <div className="compr-topo">
          <div>
            <p className="compr-marca">🩸 Hemare</p>
            <h1>Comprovante de doação de sangue</h1>
          </div>
          <span className={valido ? 'compr-selo-ok' : 'compr-selo-erro'} role="status">
            {valido ? '✓ Verificado na cadeia de confiança' : '✕ Registro com inconsistência'}
          </span>
        </div>

        {!valido && (
          <p className="compr-alerta">
            Este registro não confere com a cadeia de confiança do Hemare: os dados podem ter sido alterados.
            Não aceite este comprovante sem confirmar com o hemocentro.
          </p>
        )}

        <dl className="compr-dados">
          <div><dt>Doador(a)</dt><dd>{doacao.doador}</dd></div>
          {doacao.cpf && <div><dt>CPF</dt><dd>{doacao.cpf}</dd></div>}
          <div><dt>Data da doação</dt><dd>{formatarData(doacao.data)}</dd></div>
          <div>
            <dt>Local</dt>
            <dd>{doacao.hospital}{doacao.cidade ? ' — ' + doacao.cidade + (doacao.estado ? '/' + doacao.estado : '') : ''}</dd>
          </div>
          {doacao.cnes && <div><dt>CNES</dt><dd>{doacao.cnes}</dd></div>}
          <div><dt>Registro</dt><dd>nº {registro}</dd></div>
        </dl>

        <div className="compr-verificacao">
          {qr && <img src={qr} alt="QR code para conferir este comprovante" className="compr-qr" />}
          <div>
            <p><strong>Como conferir:</strong> aponte a câmera para o QR code ou abra este endereço. O Hemare recalcula
              o código do registro e confere a ligação com o registro anterior da cadeia — se qualquer dado for
              alterado, o comprovante deixa de ser válido.</p>
            <p className="compr-codigo">Código: <code>{codigo}</code></p>
          </div>
        </div>

        <p className="compr-legal">
          Pela CLT (art. 473, IV), o trabalhador pode faltar 1 dia a cada 12 meses, sem desconto, em caso de doação
          voluntária de sangue comprovada. <strong>O documento oficial é a declaração entregue pelo hemocentro</strong>;
          este comprovante do Hemare é uma confirmação adicional, que qualquer pessoa pode verificar.
        </p>
      </div>

      <div className="compr-acoes">
        <button type="button" className="compr-btn" onClick={() => window.print()}>🖨️ Imprimir ou salvar em PDF</button>
        <Link to="/direitos" className="compr-btn compr-btn-vazado">Seus direitos como doador</Link>
      </div>
    </div>
  );
}

export default Comprovante;
