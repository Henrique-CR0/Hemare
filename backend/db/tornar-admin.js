// Hemare - Transforma uma conta ja cadastrada em ADMINISTRADOR.
// Nao existe cadastro de admin pelo site, de proposito: so quem tem acesso ao banco cria.
// Uso:  node db/tornar-admin.js email@exemplo.com
const pool = require('../banco');

async function tornarAdmin() {
    const email = (process.argv[2] || '').trim().toLowerCase();
    if (!email) {
        console.log('Uso: node db/tornar-admin.js email@exemplo.com');
        await pool.end();
        return;
    }

    try {
        const r = await pool.query(
            "UPDATE usuarios SET tipo = 'admin' WHERE LOWER(email) = $1 RETURNING nome, email",
            [email]
        );
        if (r.rowCount === 0) {
            console.log('❌ Nenhuma conta com o email ' + email + '. Cadastre-se no site primeiro.');
        } else {
            console.log('✅ ' + r.rows[0].nome + ' (' + r.rows[0].email + ') agora e administrador.');
            console.log('   Saia e entre de novo no site para o acesso de admin valer.');
        }
    } catch (erro) {
        console.log('❌ Erro:', erro.message);
    } finally {
        await pool.end();
    }
}

tornarAdmin();
