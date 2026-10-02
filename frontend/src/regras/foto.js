// Hemare - Prepara a foto de perfil no proprio navegador: recorta o centro em quadrado, reduz e converte para JPEG.
// Alem de ficar leve (~20 KB), o JPEG novo nao carrega os metadados da camera (como a localizacao onde a foto foi tirada).
const LIMITE_CARACTERES = 80000; // o servidor aceita ate 90000

export function reduzirFoto(arquivo, lado = 256) {
  return new Promise((resolve, reject) => {
    if (!arquivo || !String(arquivo.type).startsWith('image/')) {
      reject(new Error('Escolha um arquivo de imagem (JPG, PNG...).'));
      return;
    }
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const menor = Math.min(img.width, img.height);
      const canvas = document.createElement('canvas');
      canvas.width = lado;
      canvas.height = lado;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff'; // PNG transparente vira fundo branco no JPEG
      ctx.fillRect(0, 0, lado, lado);
      ctx.drawImage(img, (img.width - menor) / 2, (img.height - menor) / 2, menor, menor, 0, 0, lado, lado);

      let qualidade = 0.85;
      let dados = canvas.toDataURL('image/jpeg', qualidade);
      while (dados.length > LIMITE_CARACTERES && qualidade > 0.4) {
        qualidade -= 0.1;
        dados = canvas.toDataURL('image/jpeg', qualidade);
      }
      if (dados.length > LIMITE_CARACTERES) reject(new Error('Não consegui reduzir essa imagem. Tente outra.'));
      else resolve(dados);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não consegui abrir essa imagem. Tente um JPG ou PNG.'));
    };
    img.src = url;
  });
}
