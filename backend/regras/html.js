// Hemare - Evita que um texto digitado (ex.: nome "<script>") vire HTML dentro dos emails.
function escaparHtml(texto) {
    return String(texto == null ? '' : texto).replace(/[&<>"']/g, (c) => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
}

module.exports = { escaparHtml };
