// toast.js
const Toast = (function() {
    let container = null;

    function init() {
        if (document.getElementById('toast-container')) return;
        
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    function show(message, type = 'success') {
        if (!container) init();

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icon = type === 'success' ? 'ph-check-circle' : 'ph-warning-circle';
        
        toast.innerHTML = `
            <i class="ph ${icon}"></i>
            <span>${message}</span>
        `;

        container.appendChild(toast);

        // Remove toast after animation
        setTimeout(() => {
            toast.classList.add('toast-show');
        }, 10);

        setTimeout(() => {
            toast.classList.remove('toast-show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }

    return {
        show,
        showNotification: show // Alias solicitado pelo usuário
    };
})();

