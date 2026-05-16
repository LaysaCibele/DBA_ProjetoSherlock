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
                        
                        // Atualizar label no grafo se for nome ou descricao
                        if (updatedData.nome) {
                            const caso = meusCasos[currentCaseIndex];
                            if (typeof GraphEngine !== 'undefined') {
                                GraphEngine.renderGraphForCase(caso);
                            }
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
        ElementModal.onSave((elementoSalvo) => {
            try {
                let nodeGroup = '';
                let edgeLabel = '';
                
                if (elementoSalvo.tipo === 'pessoa') {
                    edgeLabel = 'Envolvido em';
                    nodeGroup = 'suspect';
                } else if (elementoSalvo.tipo === 'local') {
                    edgeLabel = 'Relacionado a';
                    nodeGroup = 'location';
                } else if (elementoSalvo.tipo === 'veiculo') {
                    edgeLabel = 'Usado em';
                    nodeGroup = 'vehicle';
                } else if (elementoSalvo.tipo === 'arma') {
                    edgeLabel = 'Usada em';
                    nodeGroup = 'weapon';
                }

                const nodeData = {
                    id: elementoSalvo.id,
                    label: elementoSalvo.nome || elementoSalvo.modelo || elementoSalvo.tipo_arma || elementoSalvo.nome_local,
                    group: nodeGroup
                };

                const caso = meusCasos[currentCaseIndex];
                
                // Salvar no estado local para não sumir ao sair e voltar do grafo
                if (!caso.elementosExtras) {
                    caso.elementosExtras = [];
                }
                caso.elementosExtras.push({
                    id: elementoSalvo.id,
                    tipo: elementoSalvo.tipo,
                    nome: nodeData.label,
                    x: null,
                    y: null,
                    ...elementoSalvo
                });

                if (typeof GraphEngine !== 'undefined') {
                    // Força a re-renderização do grafo inteiro com o novo elemento atualizado
                    GraphEngine.renderGraphForCase(caso);
                }
            } catch (err) {
                console.error("Erro ao desenhar elemento no grafo:", err);
                if (typeof UI !== 'undefined') {
                    UI.showNotification("Erro interno ao exibir no grafo.", "error");
                }
            }
        });
    }

    // ---- 8. Carregar Casos ----
    carregarCasos();

});