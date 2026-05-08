// ui.js - Utilitários de Interface

const UI = (function() {
    
    /**
     * Mostra uma notificação elegante (Toast) no canto da tela.
     * @param {string} mensagem - Texto a ser exibido.
     * @param {string} tipo - 'success' ou 'error'.
     */
    function showNotification(mensagem, tipo = 'success') {
        if (typeof Toast !== 'undefined') {
            Toast.show(mensagem, tipo);
        } else {
            console.warn('Sistema de Toasts não carregado. Usando fallback alert.');
            alert(mensagem);
        }
    }

    return {
        showNotification
    };
})();
