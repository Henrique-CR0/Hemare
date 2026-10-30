// Hemare - Sessao do usuario no navegador: login automatico, renovacao silenciosa e saida segura.
//
// O que isto faz:
//  - quem ja entrou volta direto para a sua area ao abrir o site (o token fica guardado no navegador);
//  - ao abrir o site (e a cada poucos minutos, e quando a aba volta ao foco) confere com o servidor se a sessao ainda vale
//    e, passada a metade da vida do token, troca por um novo sem a pessoa perceber;
//  - se o servidor disser que a sessao acabou (expirou, trocou a senha em outro aparelho, conta excluida), limpa tudo e
//    leva para o login com um aviso, em vez de deixar a tela quebrada.
//
// O token e guardado em localStorage, como ja era. Troca-lo por um cookie httpOnly seria mais seguro contra XSS, mas exige
// mexer no CORS e no servidor (ver docs/ARQUITETURA.md).
import { URL_BACKEND } from './config';

const CHAVE_TOKEN = 'hemare_token';
const CHAVE_USUARIO = 'hemare_usuario';
const CHAVE_MOTIVO = 'hemare_motivo';
const A_CADA_MS = 5 * 60 * 1000;

function guardar(chave, valor) {
  try { localStorage.setItem(chave, valor); } catch { /* armazenamento bloqueado */ }
}
function ler(chave) {
  try { return localStorage.getItem(chave); } catch { return null; }
}
function remover(chave) {
  try { localStorage.removeItem(chave); } catch { /* armazenamento bloqueado */ }
}

// Le os dados de dentro do JWT (sem conferir a assinatura: quem confere e o servidor). So serve para saber a validade.
export function decodificar(token) {
  try {
    const parte = String(token).split('.')[1];
    const base64 = parte.replace(/-/g, '+').replace(/_/g, '/');
    const binario = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(binario, (c) => c.charCodeAt(0))));
  } catch {
    return null;
  }
}

// Passou da validade? margemSeg: considera expirado um pouco antes.
export function sessaoExpirada(token, margemSeg = 0) {
  const dados = decodificar(token);
  if (!dados || !dados.exp) return true;
  return dados.exp * 1000 <= Date.now() + margemSeg * 1000;
}

// { token, usuario } da sessao guardada, ou null se nao ha sessao valida (sem token, token ilegivel ou expirado).
export function lerSessao() {
  const token = ler(CHAVE_TOKEN);
  if (!token || sessaoExpirada(token)) return null;
  let usuario = null;
  try { usuario = JSON.parse(ler(CHAVE_USUARIO)); } catch { usuario = null; }
  if (!usuario) {
    const d = decodificar(token);
    usuario = d ? { id: d.id, nome: d.nome, tipo: d.tipo } : null;
  }
  return usuario ? { token, usuario } : null;
}

export function salvarSessao(token, usuario) {
  guardar(CHAVE_TOKEN, token);
  if (usuario) guardar(CHAVE_USUARIO, JSON.stringify(usuario));
}

// Sai: apaga a sessao do navegador. 'motivo' ('expirou') faz o login mostrar um aviso.
export function encerrarSessao(motivo) {
  remover(CHAVE_TOKEN);
  remover(CHAVE_USUARIO);
  if (motivo) guardar(CHAVE_MOTIVO, motivo); else remover(CHAVE_MOTIVO);
}

// Le (e apaga) o aviso de por que a sessao acabou.
export function lerMotivo() {
  const motivo = ler(CHAVE_MOTIVO);
  remover(CHAVE_MOTIVO);
  return motivo;
}

function irParaLogin() {
  if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) window.location.assign('/login');
}

// Pergunta ao servidor se a sessao ainda vale. Se pediu renovacao, troca o token. Devolve o usuario ou null.
export async function conferirSessao() {
  const sessao = lerSessao();
  if (!sessao) return null;
  try {
    const r = await fetch(URL_BACKEND + '/auth/eu', { headers: { Authorization: 'Bearer ' + sessao.token } });
    if (r.status === 401) return null; // o interceptador abaixo ja limpou a sessao
    if (!r.ok) return sessao.usuario; // servidor com problema: mantem a sessao, tenta de novo depois
    const dados = await r.json();
    salvarSessao(sessao.token, dados.usuario);
    if (dados.renovar) {
      const nova = await fetch(URL_BACKEND + '/auth/renovar', { method: 'POST', headers: { Authorization: 'Bearer ' + sessao.token } });
      if (nova.ok) {
        const d = await nova.json();
        salvarSessao(d.token, d.usuario);
      }
    }
    return dados.usuario;
  } catch {
    return sessao.usuario; // sem internet: nao derruba a sessao por isso
  }
}

let instalada = false;

// Liga o login automatico. Chamar uma vez, antes de desenhar o site (main.jsx).
export function instalarSessao() {
  if (instalada || typeof window === 'undefined') return;
  instalada = true;

  // 1) Interceptador: resposta 401 de uma chamada que levava o token da sessao atual = sessao acabou.
  const fetchOriginal = window.fetch.bind(window);
  window.fetch = async (entrada, opcoes) => {
    const resposta = await fetchOriginal(entrada, opcoes);
    if (resposta.status === 401) {
      const url = typeof entrada === 'string' ? entrada : (entrada && entrada.url) || '';
      const cabecalho = (opcoes && opcoes.headers && (opcoes.headers.Authorization || opcoes.headers.authorization)) || '';
      const ehDaApi = url.startsWith(URL_BACKEND);
      const naoELogin = !url.includes('/auth/login') && !url.includes('/recuperacao/');
      const eDaSessaoAtual = cabecalho === 'Bearer ' + ler(CHAVE_TOKEN);
      if (ehDaApi && naoELogin && eDaSessaoAtual) {
        encerrarSessao('expirou');
        irParaLogin();
      }
    }
    return resposta;
  };

  // 2) Confere agora, a cada 5 minutos e quando a aba volta a ficar visivel.
  conferirSessao();
  setInterval(conferirSessao, A_CADA_MS);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') conferirSessao(); });
}
