document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements - Login
    const containerLogin = document.getElementById('container-login');
    const loginForm = document.getElementById('login-form');
    const matriculaInput = document.getElementById('matricula');
    const senhaInput = document.getElementById('senha');
    const errorMsgLogin = document.getElementById('error-message');
    const linkCadastro = document.getElementById('link-cadastro');

    // DOM Elements - Cadastro
    const containerCadastro = document.getElementById('container-cadastro');
    const cadastroForm = document.getElementById('cadastro-form');
    const cadNomeInput = document.getElementById('cad-nome');
    const cadMatriculaInput = document.getElementById('cad-matricula');
    const cadSenhaInput = document.getElementById('cad-senha');
    const cadDistritoInput = document.getElementById('cad-distrito');
    const errorMsgCad = document.getElementById('error-message-cad');
    const linkLogin = document.getElementById('link-login');

    // Toggle Password Visibility (Shared)
    const togglePasswordBtns = document.querySelectorAll('.toggle-password');
    togglePasswordBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.previousElementSibling;
            const icon = btn.querySelector('i');
            const isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';
            icon.classList.toggle('ph-eye');
            icon.classList.toggle('ph-eye-slash');
        });
    });

    function showCadastro(e) {
        if (e) e.preventDefault();
        containerLogin.style.display = 'none';
        containerCadastro.style.display = 'block';
        if (errorMsgCad) errorMsgCad.style.display = 'none';
        cadastroForm.reset();
    }

    function showLogin(e) {
        if (e) e.preventDefault();
        containerCadastro.style.display = 'none';
        containerLogin.style.display = 'block';
        if (errorMsgLogin) errorMsgLogin.style.display = 'none';
        loginForm.reset();
    }

    if (linkCadastro) linkCadastro.addEventListener('click', showCadastro);
    if (linkLogin) linkLogin.addEventListener('click', showLogin);

    // --- INTEGRAÇÃO COM DJANGO (CADASTRO) ---
    if (cadastroForm) {
        cadastroForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const payload = {
                nome: cadNomeInput.value.trim(),
                matricula: cadMatriculaInput.value.trim(),
                senha: cadSenhaInput.value,
                distrito: cadDistritoInput.options[cadDistritoInput.selectedIndex]?.text || ''
            };

            try {
                const response = await fetch('/users/cadastrar/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();

                if (data.success) {
                    UI.showNotification('Cadastro realizado com sucesso!', 'success');
                    showLogin();
                } else {
                    if (errorMsgCad) {
                        errorMsgCad.textContent = data.message || 'Erro ao cadastrar.';
                        errorMsgCad.style.display = 'block';
                    }
                }
            } catch (error) {
                UI.showNotification('Erro de conexão com o servidor.', 'error');
            }
        });
    }

    // --- INTEGRAÇÃO COM DJANGO (LOGIN) ---
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const payload = {
                matricula: matriculaInput.value,
                senha: senhaInput.value
            };

            try {
                const response = await fetch('/users/login/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();

                if (data.success) {
                    // Mantemos o currentUser no localStorage para o Dashboard exibir o nome rápido
                    localStorage.setItem('currentUser', JSON.stringify(data.user));
                    window.location.href = "/dashboard/";
                } else {
                    if (errorMsgLogin) {
                        errorMsgLogin.textContent = data.message || 'Matrícula ou senha incorretos.';
                        errorMsgLogin.style.display = 'block';
                    }
                    UI.showNotification('Falha no acesso!', 'error');
                }
            } catch (error) {
                UI.showNotification('Erro ao conectar ao servidor.', 'error');
            }
        });
    }
});