// dashboard.js - Coordenador Principal

document.addEventListener('DOMContentLoaded', () => {

    // ---- 1. Authentication Check & Logout ----
    const logoutBtn = document.getElementById('logout-btn');
    const displayMatricula = document.getElementById('display-matricula');
    const displayName = document.getElementById('display-name');
    const displayDistrito = document.getElementById('display-distrito');

    const savedUserJson = localStorage.getItem('currentUser');

    let user = null;

    if (savedUserJson) {
        user = JSON.parse(savedUserJson);

        if (displayMatricula) {
            displayMatricula.textContent = user.matricula;
        }

        if (displayName) {
            displayName.textContent = user.nome;
        }

        if (displayDistrito) {
            displayDistrito.textContent = user.distrito || 'Sem Lotação';
        }

    } else {
        window.location.href = "/";
        return;
    }

    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('currentUser');
            window.location.href = "/";
        });
    }

    // ---- 2. Estado Global ----
    let meusCasos = [];
    let currentCaseIndex = null;

    async function carregarCasos() {
        try {

            const response = await fetch('/listar-casos/');

            meusCasos = await response.json();

            if (typeof CaseManager !== 'undefined') {
                CaseManager.renderCards(meusCasos);
            }

        } catch (error) {

            console.error('Erro ao carregar casos:', error);

            UI.showNotification(
                'Erro ao carregar casos.',
                'error'
            );
        }
    }

    // ---- 3. View Management ----
    const viewHome = document.getElementById('view-home');
    const viewGraph = document.getElementById('view-graph');

    const btnVoltarHome = document.getElementById('btn-voltar-home');

    const btnNovoCaso = document.getElementById('btn-novo-caso');

    const btnNovoText = document.getElementById('btn-novo-text');

    const btnAddEdge = document.getElementById('btn-add-edge');

    const searchInput = document.getElementById('search-input');

    function showHomeView() {

        currentCaseIndex = null;

        if (btnNovoText) {
            btnNovoText.textContent = 'Novo Caso';
        }

        if (btnAddEdge) {
            btnAddEdge.style.display = 'none';
        }

        viewGraph.classList.remove('active');

        setTimeout(() => {
            viewHome.classList.add('active');
        }, 150);
    }

    function showGraphView(index) {

        currentCaseIndex = index;

        if (btnNovoText) {
            btnNovoText.textContent = 'Adicionar Elemento';
        }

        if (btnAddEdge) {
            btnAddEdge.style.display = 'block';
        }

        viewHome.classList.remove('active');

        setTimeout(() => {
            viewGraph.classList.add('active');
        }, 150);
    }

    // Voltar Home
    if (btnVoltarHome) {
        btnVoltarHome.addEventListener('click', showHomeView);
    }

    // Adicionar vínculo
    if (btnAddEdge) {
        btnAddEdge.addEventListener('click', () => {

            if (
                typeof GraphEngine !== 'undefined' &&
                GraphEngine.enableEdgeMode
            ) {
                GraphEngine.enableEdgeMode();
            }

        });
    }

    // Novo Caso / Novo Elemento
    if (btnNovoCaso) {

        btnNovoCaso.addEventListener('click', () => {

            // HOME
            if (currentCaseIndex === null) {

                if (
                    typeof Wizard !== 'undefined' &&
                    Wizard.open
                ) {
                    Wizard.open();
                }

            }

            // GRAFO
            else {

                if (
                    typeof ElementModal !== 'undefined' &&
                    ElementModal.open
                ) {
                    ElementModal.open();
                }

            }

        });

    }

    // ---- 4. Busca em Tempo Real ----
    if (searchInput) {

        searchInput.addEventListener('input', (e) => {

            const term = e.target.value.toLowerCase();

            const filtered = meusCasos.filter(caso => {

                return (
                    caso.crime.titulo.toLowerCase().includes(term) ||
                    caso.pessoa.nome.toLowerCase().includes(term) ||
                    caso.id.toLowerCase().includes(term)
                );

            });

            if (typeof CaseManager !== 'undefined') {
                CaseManager.renderCards(filtered);
            }

        });

    }

    // ---- 5. Inicialização do Wizard ----
    if (typeof Wizard !== 'undefined') {

        Wizard.init();

        Wizard.onSave(async (payload) => {

            try {

                const response = await fetch('/criar-caso/', {
                    method: 'POST',

                    headers: {
                        'Content-Type': 'application/json'
                    },

                    body: JSON.stringify(payload)
                });

                const data = await response.json();

                if (data.success) {

                    carregarCasos();

                    UI.showNotification(
                        'Cadastro realizado com sucesso!',
                        'success'
                    );

                } else {

                    UI.showNotification(
                        'Erro ao cadastrar caso.',
                        'error'
                    );

                }

            } catch (error) {

                console.error(error);

                UI.showNotification(
                    'Erro ao cadastrar caso.',
                    'error'
                );

            }

        });

    }

    // ---- 6. Inicialização do CaseManager ----
    if (typeof CaseManager !== 'undefined') {

        CaseManager.renderCards(meusCasos);

        CaseManager.onCaseClick((casoClicado) => {

            const index = meusCasos.findIndex(c =>
                c.crime.id === casoClicado.crime.id
            );

            showGraphView(index);

            if (typeof GraphEngine !== 'undefined') {
                GraphEngine.renderGraphForCase(casoClicado);
            }

            if (typeof CaseManager.showInspector !== 'undefined') {
                CaseManager.showInspector(null);
            }

        });

    }

    // ---- 7. Inicialização do GraphEngine ----
    if (typeof GraphEngine !== 'undefined') {
        GraphEngine.init();
    }

    // ---- 8. Carregar Casos ----
    carregarCasos();

});