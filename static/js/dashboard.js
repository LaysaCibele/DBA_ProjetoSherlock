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

                    await carregarCasos();
                    showHomeView();
                    if (typeof CaseManager !== 'undefined') {
                        CaseManager.renderCards(meusCasos);
                    }

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
            window.currentCaseId = casoClicado.id;
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

        CaseManager.onDeleteCase(async (caso) => {
            try {
                let confirmed = true;
                if (typeof CustomDialogs !== 'undefined' && CustomDialogs.confirm) {
                    confirmed = await CustomDialogs.confirm(`Deseja realmente excluir o caso #${caso.crime.id_crime}?`, 'Excluir Caso');
                } else {
                    confirmed = confirm(`Deseja realmente excluir o caso #${caso.crime.id_crime}?`);
                }

                if (confirmed) {
                    const response = await fetch('/deletar-caso/', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: caso.id })
                    });
                    const resData = await response.json();
                    
                    if (resData.success) {
                        await carregarCasos();
                        if (typeof UI !== 'undefined') {
                            UI.showNotification('Caso excluído com sucesso!', 'success');
                        }
                    } else {
                        if (typeof UI !== 'undefined') {
                            UI.showNotification(resData.message || 'Erro ao excluir caso.', 'error');
                        }
                    }
                }
            } catch (error) {
                console.error("Erro no delete:", error);
                if (typeof UI !== 'undefined') {
                    UI.showNotification('Erro interno: ' + error.message, 'error');
                }
            }
        });

        // Atualizar informações do elemento
        if (typeof CaseManager.onDataUpdated !== 'undefined') {
            CaseManager.onDataUpdated(async (updatedData) => {
                try {
                    const response = await fetch('/atualizar-elemento/', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            id: updatedData.id,
                            dados: updatedData
                        })
                    });
                    const resData = await response.json();
                    
                    if (resData.success) {
                        UI.showNotification('Elemento atualizado!', 'success');
                        
                        const caso = meusCasos[currentCaseIndex];
                        
                        if (updatedData.id.startsWith('crime_')) {
                            Object.assign(caso.crime, updatedData);
                        } else if (updatedData.id.startsWith('local_')) {
                            Object.assign(caso.local, updatedData);
                        } else if (updatedData.id.startsWith('pessoa_')) {
                            Object.assign(caso.pessoa, updatedData);
                        } else if (updatedData.id.startsWith('extra_')) {
                            const extra = caso.elementosExtras.find(e => e.id === updatedData.id);
                            if (extra) Object.assign(extra, updatedData);
                        }

                        if (typeof GraphEngine !== 'undefined') {
                            GraphEngine.renderGraphForCase(caso);
                        }
                    } else {
                        UI.showNotification(resData.message || 'Erro ao atualizar', 'error');
                    }
                } catch (error) {
                    UI.showNotification(`Erro na requisição: ${error.message}`, 'error');
                }
            });
        }

        // Remover elemento do caso
        if (typeof CaseManager.onRemoveElement !== 'undefined') {
            CaseManager.onRemoveElement(async (elementId) => {
                // Se for o nó do Caso (ou outro principal), deleta o caso inteiro
                if (elementId.startsWith('crime_') || elementId.startsWith('pessoa_') || elementId.startsWith('local_')) {
                    try {
                        const response = await fetch('/deletar-caso/', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id: window.currentCaseId })
                        });
                        const resData = await response.json();
                        
                        if (resData.success) {
                            UI.showNotification('Caso excluído com sucesso!', 'success');
                            showHomeView();
                            carregarCasos();
                            if (typeof CaseManager.showInspector !== 'undefined') {
                                CaseManager.showInspector(null);
                            }
                        } else {
                            UI.showNotification(resData.message || 'Erro ao excluir o caso', 'error');
                        }
                    } catch (error) {
                        UI.showNotification(`Erro na requisição: ${error.message}`, 'error');
                    }
                    return;
                }

                try {
                    const response = await fetch('/remover-elemento/', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: elementId })
                    });
                    const resData = await response.json();
                    
                    if (resData.success) {
                        UI.showNotification('Elemento removido!', 'success');
                        
                        // Limpa o inspetor
                        if (typeof CaseManager.showInspector !== 'undefined') {
                            CaseManager.showInspector(null);
                        }
                        
                        // Remove do estado local
                        const caso = meusCasos[currentCaseIndex];
                        if (caso && caso.elementosExtras) {
                            caso.elementosExtras = caso.elementosExtras.filter(e => e.id !== elementId);
                        }
                        
                        // Atualiza grafo removendo apenas o nó e suas arestas diretamente
                        if (typeof GraphEngine !== 'undefined') {
                            GraphEngine.removeNode(elementId);
                        }
                    } else {
                        UI.showNotification(resData.message || 'Erro ao remover', 'error');
                    }
                } catch (error) {
                    UI.showNotification(`Erro na requisição: ${error.message}`, 'error');
                }
            });
        }

    }

    // ---- 7. Inicialização do GraphEngine ----
    if (typeof GraphEngine !== 'undefined') {
        GraphEngine.init();
        
        GraphEngine.onNodeClick((nodeId) => {
            if (!nodeId) {
                if (typeof CaseManager !== 'undefined' && typeof CaseManager.showInspector !== 'undefined') {
                    CaseManager.showInspector(null);
                }
                return;
            }

            const caso = meusCasos[currentCaseIndex];
            if (!caso) return;

            let nodeData = null;

            if (caso.crime.id === nodeId) nodeData = { tipo: 'Caso', ...caso.crime };
            else if (caso.local.id === nodeId) nodeData = { tipo: 'Local', ...caso.local };
            else if (caso.pessoa.id === nodeId) nodeData = { tipo: 'Pessoa', ...caso.pessoa };
            else if (caso.elementosExtras) {
                const extra = caso.elementosExtras.find(e => e.id === nodeId);
                if (extra) nodeData = extra;
            }

            if (nodeData && typeof CaseManager !== 'undefined' && typeof CaseManager.showInspector !== 'undefined') {
                CaseManager.showInspector(nodeData);
            }
        });
    }

    // ---- 7.5 Inicialização do ElementModal ----
    if (typeof ElementModal !== 'undefined') {
        ElementModal.init();
        ElementModal.onSave(async (elementoSalvo) => {
            try {
                // Aguarda carregar casos atualizados do back-end para não perder conexões manuais
                await carregarCasos();
                
                const casoAtualizado = meusCasos.find(c => c.id === window.currentCaseId);
                
                if (casoAtualizado && typeof GraphEngine !== 'undefined') {
                    // Atualiza o índice caso tenha mudado
                    currentCaseIndex = meusCasos.findIndex(c => c.id === window.currentCaseId);
                    
                    // Força a re-renderização do grafo inteiro com todos os elementos E conexões originais + manuais que vieram do banco
                    GraphEngine.renderGraphForCase(casoAtualizado);
                }
            } catch (err) {
                console.error("Erro ao redesenhar elemento no grafo:", err);
                if (typeof UI !== 'undefined') {
                    UI.showNotification("Erro interno ao atualizar grafo.", "error");
                }
            }
        });
    }

    // ---- 8. Carregar Casos ----
    carregarCasos();

});