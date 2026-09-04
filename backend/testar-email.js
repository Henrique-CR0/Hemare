// Hemare - Teste de envio com Resend.
require('dotenv').config();
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

async function testar() {
    try {
        const r = await resend.emails.send({
            from: 'Hemare <onboarding@resend.dev>',
            to: 'hemare.sangue814@gmail.com',
            subject: 'Teste do Hemare 🩸',
            text: 'Se você recebeu este email, o envio está funcionando!'
        });
        console.log('✅ Resultado:', JSON.stringify(r));
    } catch (erro) {
        console.log('❌ Erro:', erro.message);
    }
}

testar();