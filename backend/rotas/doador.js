// Hemare - Rotas do doador (completar/atualizar perfil, conquistas e placar publico).
const express = require('express');
const pool = require('../banco');
const autenticar = require('../middleware/autenticar');
const { calcularConquistas, montarPlacar } = require('../regras/gamificacao');
const { verificarElegibilidade } = require('../regras/elegibilidade');
const { gerarCodigo } = require('../regras/indicacao');

const router = express.Router();

// Amigos convidados por este usuario que ja tem pelo menos uma doacao confirmada.
// Devolve 0 se as colunas de indicacao ainda nao existem (db/ajustar-indicacao.js nao rodou).
async function contarAmigosQueDoaram(usuarioId) {
    try {
        const r = await pool.query(
            `SELECT COUNT(DISTINCT dr.id) AS total
               FROM usuarios u
               JOIN doadores dr ON dr.usuario_id = u.id
               JOIN doacoes dc ON dc.doador_id = dr.id
              WHERE u.indicado_por = $1`,
            [usuarioId]
        );
        return Number(r.rows[0].total) || 0;
    } catch (erro) {
        return 0;
    }
}

// COMPLETAR PERFIL: salva os dados do doador logado.
router.post('/perfil', autenticar, async (req, res) => {
    const usuarioId = req.usuario.id;
    const { tipoSanguineo, sexo, cidade, nomeSocial, cpf, telefone, visibilidade } = req.body;

    if (!tipoSanguineo || !sexo || !cidade || !cpf) {
        return res.status(400).json({ erro: 'Preencha tipo sanguineo, sexo, cidade e CPF.' });
    }

    const vis = visibilidade === 'identificado' ? 'identificado' : 'anonimo';

    try {
        const existe = await pool.query('SELECT id FROM doadores WHERE usuario_id = $1', [usuarioId]);
        if (existe.rows.length > 0) {
            await pool.query(
                `UPDATE doadores SET tipo_sanguineo=$1, sexo=$2, cidade=$3, nome_social=$4, cpf=$5, telefone=$6, visibilidade=$7
                 WHERE usuario_id=$8`,
                [tipoSanguineo, sexo, cidade, nomeSocial || null, cpf || null, telefone || null, vis, usuarioId]
            );
        } else {
            await pool.query(
                `INSERT INTO doadores (usuario_id, tipo_sanguineo, sexo, cidade, nome_social, cpf, telefone, visibilidade)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
                [usuarioId, tipoSanguineo, sexo, cidade, nomeSocial || null, cpf || null, telefone || null, vis]
            );
        }
        res.json({ mensagem: 'Perfil salvo com sucesso!' });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao salvar perfil: ' + erro.message });
    }
});

// CONQUISTAS: nivel, emblemas e quando o doador logado pode doar de novo (gamificacao).
router.get('/conquistas', autenticar, async (req, res) => {
    try {
        // SELECT * para funcionar mesmo antes de rodar db/ajustar-lembretes.js (quer_lembrete pode nao existir ainda).
        const r = await pool.query('SELECT * FROM doadores WHERE usuario_id = $1', [req.usuario.id]);

        if (r.rows.length === 0) {
            return res.status(404).json({ erro: 'Complete seu perfil para ver suas conquistas.' });
        }

        const doa = r.rows[0];
        const rAno = await pool.query(
            "SELECT COUNT(*) AS total FROM doacoes WHERE doador_id = $1 AND data_doacao >= CURRENT_DATE - INTERVAL '12 months'",
            [doa.id]
        );
        doa.doacoes_ultimo_ano = rAno.rows[0].total;
        const conquistas = calcularConquistas({
            totalDoacoes: Number(doa.total_doacoes) || 0,
            doacoesUltimoAno: Number(doa.doacoes_ultimo_ano),
            tipoSanguineo: doa.tipo_sanguineo,
            visibilidade: doa.visibilidade,
            amigosQueDoaram: await contarAmigosQueDoaram(req.usuario.id)
        });

        // Quando pode doar de novo (so se o sexo estiver informado como M/F).
        const elegibilidade = (doa.sexo === 'M' || doa.sexo === 'F')
            ? verificarElegibilidade(doa.ultima_doacao, doa.sexo)
            : null;

        res.json({ ...conquistas, elegibilidade, querLembrete: doa.quer_lembrete === true });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao buscar conquistas: ' + erro.message });
    }
});

// TRAGA UM AMIGO: codigo de convite do doador (criado na primeira vez) e quantos amigos vieram.
// So devolve numeros: nunca o nome de quem foi convidado.
router.get('/indicacao', autenticar, async (req, res) => {
    if (req.usuario.tipo !== 'doador') {
        return res.status(403).json({ erro: 'O convite de amigos e para contas de doador.' });
    }
    try {
        const r = await pool.query('SELECT codigo_indicacao FROM usuarios WHERE id = $1', [req.usuario.id]);
        if (r.rows.length === 0) {
            return res.status(404).json({ erro: 'Conta nao encontrada.' });
        }

        let codigo = r.rows[0].codigo_indicacao;
        // Sorteia ate achar um codigo livre (colisao e raridade: o indice unico recusa repetidos).
        for (let tentativa = 0; !codigo && tentativa < 5; tentativa++) {
            try {
                const u = await pool.query(
                    'UPDATE usuarios SET codigo_indicacao = $1 WHERE id = $2 AND codigo_indicacao IS NULL RETURNING codigo_indicacao',
                    [gerarCodigo(), req.usuario.id]
                );
                codigo = u.rows.length > 0 ? u.rows[0].codigo_indicacao : null;
            } catch (erro) {
                if (erro.code !== '23505') throw erro;
            }
        }
        if (!codigo) {
            const outraLeitura = await pool.query('SELECT codigo_indicacao FROM usuarios WHERE id = $1', [req.usuario.id]);
            codigo = outraLeitura.rows[0].codigo_indicacao;
        }
        if (!codigo) {
            return res.status(500).json({ erro: 'Nao consegui gerar seu codigo agora. Tente de novo.' });
        }

        const cadastrados = await pool.query('SELECT COUNT(*) AS total FROM usuarios WHERE indicado_por = $1', [req.usuario.id]);
        res.json({
            codigo: codigo,
            amigosCadastrados: Number(cadastrados.rows[0].total) || 0,
            amigosQueDoaram: await contarAmigosQueDoaram(req.usuario.id)
        });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao buscar seu convite: ' + erro.message });
    }
});

// LEMBRETE DE RETORNO: o doador liga ou desliga o email "voce ja pode doar de novo" (opt-in).
router.post('/lembrete', autenticar, async (req, res) => {
    if (typeof req.body.ativo !== 'boolean') {
        return res.status(400).json({ erro: 'Informe se o lembrete fica ativo (true ou false).' });
    }
    try {
        const r = await pool.query(
            'UPDATE doadores SET quer_lembrete = $1 WHERE usuario_id = $2 RETURNING quer_lembrete',
            [req.body.ativo, req.usuario.id]
        );
        if (r.rows.length === 0) {
            return res.status(404).json({ erro: 'Complete seu perfil primeiro.' });
        }
        res.json({
            querLembrete: r.rows[0].quer_lembrete,
            mensagem: req.body.ativo
                ? '🔔 Combinado! Vamos te avisar por email quando você puder doar de novo.'
                : 'Lembrete desligado. Você pode ligar de novo quando quiser.'
        });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao salvar o lembrete: ' + erro.message });
    }
});

// PUBLICO: placar das cidades que mais doam (so numeros agregados, sem dados pessoais).
router.get('/placar', async (req, res) => {
    try {
        // Agrupa ignorando maiusculas e espacos ("Recife" e "recife " sao a mesma cidade).
        const r = await pool.query(
            `SELECT MIN(TRIM(cidade)) AS cidade,
                    COUNT(*) AS doadores,
                    COALESCE(SUM(total_doacoes), 0) AS doacoes
               FROM doadores
              WHERE cidade IS NOT NULL AND TRIM(cidade) <> ''
              GROUP BY LOWER(TRIM(cidade))`
        );
        res.json(montarPlacar(r.rows));
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao montar o placar: ' + erro.message });
    }
});

module.exports = router;