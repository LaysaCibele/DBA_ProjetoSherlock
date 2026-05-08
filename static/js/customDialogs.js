// customDialogs.js

const CustomDialogs = (function() {
    
    function prompt(title, message, placeholder = 'Digite aqui...') {
        return new Promise((resolve) => {
            const modal = document.getElementById('modal-prompt-custom');
            const input = document.getElementById('prompt-input');
            const btnConfirm = document.getElementById('prompt-confirm');
            const btnCancel = document.getElementById('prompt-cancel');
            const btnClose = document.getElementById('prompt-close');
            
            document.getElementById('prompt-title').textContent = title;
            document.getElementById('prompt-message').textContent = message;
            input.placeholder = placeholder;
            input.value = '';
            
            modal.classList.add('active');
            input.focus();

            const close = (value) => {
                modal.classList.remove('active');
                resolve(value);
                // Remover listeners para evitar duplicidade na próxima chamada
                btnConfirm.replaceWith(btnConfirm.cloneNode(true));
                btnCancel.replaceWith(btnCancel.cloneNode(true));
                btnClose.replaceWith(btnClose.cloneNode(true));
            };

            document.getElementById('prompt-confirm').onclick = () => {
                const val = document.getElementById('prompt-input').value;
                if (val.trim()) close(val.trim());
            };
            
            document.getElementById('prompt-cancel').onclick = () => close(null);
            document.getElementById('prompt-close').onclick = () => close(null);
            
            document.getElementById('prompt-input').onkeypress = (e) => {
                if (e.key === 'Enter') document.getElementById('prompt-confirm').click();
            };
        });
    }

    function confirm(message, title = 'Confirmar Ação') {
        return new Promise((resolve) => {
            const modal = document.getElementById('modal-confirm-custom');
            const btnOk = document.getElementById('confirm-ok');
            const btnCancel = document.getElementById('confirm-cancel');
            const btnClose = document.getElementById('confirm-close');
            
            document.getElementById('confirm-title').textContent = title;
            document.getElementById('confirm-message').textContent = message;
            
            modal.classList.add('active');

            const close = (result) => {
                modal.classList.remove('active');
                resolve(result);
                // Limpar listeners
                btnOk.replaceWith(btnOk.cloneNode(true));
                btnCancel.replaceWith(btnCancel.cloneNode(true));
                btnClose.replaceWith(btnClose.cloneNode(true));
            };

            document.getElementById('confirm-ok').onclick = () => close(true);
            document.getElementById('confirm-cancel').onclick = () => close(false);
            document.getElementById('confirm-close').onclick = () => close(false);
        });
    }

    return {
        prompt,
        confirm
    };
})();
