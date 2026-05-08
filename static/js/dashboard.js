// dashboard.js - Coordenador Principal

document.addEventListener('DOMContentLoaded', () => {
    // ---- 1. Authentication Check & Logout ----
    const logoutBtn = document.getElementById('logout-btn');
    const displayMatricula = document.getElementById('display-matricula');
    const displayName = document.getElementById('display-name');
    const displayDistrito = document.getElementById('display-distrito');

    const savedUserJson = localStorage.getItem('currentUser');
    let user = null;
    let storageKey = 'meusCasos'; // Fallback
    
    if (savedUserJson) {
        user = JSON.parse(savedUserJson);
        if (displayMatricula) displayMatricula.textContent = user.matricula;
        if (displayName) displayName.textContent = user.nome;
        if (displayDistrito) displayDistrito.textContent = user.distrito || 'Sem Lotação';
        storageKey = `${user.matricula}_meusCasos`;
    } else {
        window.location.href = 'index.html';
        return; // Stop execution
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            meusCasos = []; // Limpa memória
            currentCaseIndex = null;
            localStorage.removeItem('currentUser');
            window.location.href = 'index.html';
        });
    }

    // ---- 2. Estado Global ----
    let meusCasos = JSON.parse(localStorage.getItem(storageKey)) || [];
    let currentCaseIndex = null;

    // ---- 3. View Management (Drill-Down) ----
    const viewHome = document.getElementById('view-home');
    const viewGraph = document.getElementById('view-graph');
    const btnVoltarHome = document.getElementById('btn-voltar-home');
    const btnNovoCaso = document.getElementById('btn-novo-caso');
    const btnNovoText = document.getElementById('btn-novo-text');
    const btnAddEdge = document.getElementById('btn-add-edge');
    const searchInput = document.getElementById('search-input');

    function showHomeView() {
        currentCaseIndex = null;
        if (btnNovoText) btnNovoText.textContent = 'Novo Caso';
        if (btnAddEdge) btnAddEdge.style.display = 'none';

        viewGraph.classList.remove('active');
        setTimeout(() => {
            viewHome.classList.add('active');
        }, 150);
    }

    function showGraphView(index) {
        currentCaseIndex = index;
        if (btnNovoText) btnNovoText.textContent = 'Adicionar Elemento';
        if (btnAddEdge) btnAddEdge.style.display = 'block';

        viewHome.classList.remove('active');
        setTimeout(() => {
            viewGraph.classList.add('active');
        }, 150);
    }

    if (btnVoltarHome) {
        btnVoltarHome.addEventListener('click', showHomeView);
    }

    if (btnAddEdge) {
        btnAddEdge.addEventListener('click', () => {
            if (typeof GraphEngine !== 'undefined' && GraphEngine.enableEdgeMode) {
                GraphEngine.enableEdgeMode();
            }
        });
    }

    if (btnNovoCaso) {
        btnNovoCaso.addEventListener('click', () => {
            if (currentCaseIndex === null) {
                // Na Home -> Abre Wizard
                if (typeof Wizard !== 'undefined' && Wizard.open) {
                    Wizard.open();
                }
            } else {
                // No Grafo -> Abre ElementModal
                if (typeof ElementModal !== 'undefined' && ElementModal.open) {
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
                return caso.crime.titulo.toLowerCase().includes(term) || 
                       caso.pessoa.nome.toLowerCase().includes(term) ||
                       caso.crime.id_crime.toLowerCase().includes(term);
            });
            if (typeof CaseManager !== 'undefined') {
                CaseManager.renderCards(filtered);
            }
        });
    }

    // ---- 5. Inicialização dos Módulos ----
    
    // Iniciar Wizard
    if (typeof Wizard !== 'undefined') {
        Wizard.init();
        
        Wizard.onSave((payload) => {
            payload.elementosExtras = []; // Initialize empty array for extra elements
            meusCasos.push(payload);
            localStorage.setItem(storageKey, JSON.stringify(meusCasos));
            if (typeof CaseManager !== 'undefined') {
                CaseManager.renderCards(meusCasos);
            }
            UI.showNotification('Cadastro realizado com sucesso!', 'success');
        });
    }

    // Iniciar ElementModal
    if (typeof ElementModal !== 'undefined') {
        ElementModal.init();

        ElementModal.onSave((elemento) => {
            if (currentCaseIndex !== null) {
                // 1. Salvar na persistência
                const caso = meusCasos[currentCaseIndex];
                if (!caso.elementosExtras) caso.elementosExtras = [];
                caso.elementosExtras.push(elemento);
                localStorage.setItem(storageKey, JSON.stringify(meusCasos));

                // 2. Criar a Edge com o Crime
                const crimeId = caso.crime.id;
                let edgeLabel = '';
                let nodeGroup = '';

                if (elemento.tipo === 'pessoa') {
                    edgeLabel = 'Envolvido em';
                    nodeGroup = 'suspect';
                } else if (elemento.tipo === 'local') {
                    edgeLabel = 'Relacionado a';
                    nodeGroup = 'location';
                } else if (elemento.tipo === 'veiculo') {
                    edgeLabel = 'Usado em';
                    nodeGroup = 'vehicle';
                } else if (elemento.tipo === 'arma') {
                    edgeLabel = 'Usada em';
                    nodeGroup = 'weapon';
                }

                const nodeData = {
                    id: elemento.id,
                    label: elemento.nome,
                    group: nodeGroup
                };

                const edgeData = {
                    from: elemento.tipo === 'pessoa' || elemento.tipo === 'veiculo' || elemento.tipo === 'arma' ? elemento.id : crimeId,
                    to: elemento.tipo === 'pessoa' || elemento.tipo === 'veiculo' || elemento.tipo === 'arma' ? crimeId : elemento.id,
                    label: edgeLabel
                };

                // 3. Adicionar dinamicamente ao grafo atual
                if (typeof GraphEngine !== 'undefined') {
                    GraphEngine.addExtraNode(nodeData, edgeData);
                }
                
                UI.showNotification('Elemento adicionado ao grafo!', 'success');
            }
        });
    }

    // Iniciar GraphEngine
    if (typeof GraphEngine !== 'undefined') {
        GraphEngine.init();

        GraphEngine.onManualEdgeAdded((edgeData) => {
            if (currentCaseIndex !== null) {
                const caso = meusCasos[currentCaseIndex];
                if (!caso.conexoesManuais) caso.conexoesManuais = [];
                
                caso.conexoesManuais.push({
                    from: edgeData.from,
                    to: edgeData.to,
                    label: edgeData.label
                });
                
                localStorage.setItem(storageKey, JSON.stringify(meusCasos));
                UI.showNotification('Conexão salva!', 'success');
            }
        });

        GraphEngine.onNodeClick((nodeId) => {
            if (currentCaseIndex === null || typeof CaseManager === 'undefined' || !CaseManager.showInspector) return;

            const caso = meusCasos[currentCaseIndex];

            if (!nodeId) {
                CaseManager.showInspector(null);
                return;
            }

            let foundData = null;

            if (caso.local && caso.local.id === nodeId) {
                foundData = caso.local;
            } else if (caso.crime && caso.crime.id === nodeId) {
                foundData = caso.crime;
            } else if (caso.pessoa && caso.pessoa.id === nodeId) {
                foundData = caso.pessoa;
            } else if (caso.elementosExtras) {
                foundData = caso.elementosExtras.find(el => el.id === nodeId);
            }

            CaseManager.showInspector(foundData);
        });

        // Coordenadas do Grafo
        GraphEngine.onNodePositionChanged((nodeId, x, y) => {
            if (currentCaseIndex !== null) {
                const caso = meusCasos[currentCaseIndex];
                
                // Encontrar o elemento correspondente e atualizar x, y
                if (caso.local.id === nodeId) {
                    caso.local.x = x; caso.local.y = y;
                } else if (caso.crime.id === nodeId) {
                    caso.crime.x = x; caso.crime.y = y;
                } else if (caso.pessoa.id === nodeId) {
                    caso.pessoa.x = x; caso.pessoa.y = y;
                } else if (caso.elementosExtras) {
                    const extra = caso.elementosExtras.find(el => el.id === nodeId);
                    if (extra) {
                        extra.x = x; extra.y = y;
                    }
                }
                
                localStorage.setItem(storageKey, JSON.stringify(meusCasos));
            }
        });

        // Remoção de Vínculos (Edges)
        GraphEngine.onEdgeClick(async (edgeData) => {
            if (currentCaseIndex === null || !edgeData) return;

            const caso = meusCasos[currentCaseIndex];
            
            const confirmed = await CustomDialogs.confirm(
                'Deseja remover este vínculo entre os elementos?',
                'Remover Vínculo'
            );

            if (confirmed) {
                // 1. Se for uma conexão manual, remover do array conexoesManuais
                if (caso.conexoesManuais) {
                    const originalLength = caso.conexoesManuais.length;
                    caso.conexoesManuais = caso.conexoesManuais.filter(e => 
                        !(e.from === edgeData.from && e.to === edgeData.to)
                    );
                    
                    // Se removeu algo do conexoesManuais, já podemos salvar e retornar
                    if (caso.conexoesManuais.length !== originalLength) {
                        localStorage.setItem(storageKey, JSON.stringify(meusCasos));
                        GraphEngine.renderGraphForCase(caso);
                        UI.showNotification('Vínculo manual removido!', 'success');
                        return;
                    }
                }

                // 2. Se for uma conexão padrão ou extra, adicionar ao conexoesOcultas
                if (!caso.conexoesOcultas) caso.conexoesOcultas = [];
                caso.conexoesOcultas.push({ from: edgeData.from, to: edgeData.to });
                
                localStorage.setItem(storageKey, JSON.stringify(meusCasos));
                GraphEngine.renderGraphForCase(caso);
                UI.showNotification('Vínculo removido!', 'success');

                // 3. Limpar inspetor
                if (typeof CaseManager !== 'undefined' && CaseManager.showInspector) {
                    CaseManager.showInspector(null);
                }
            }
        });
    }



  // Iniciar CaseManager
if (typeof CaseManager !== 'undefined') {
    CaseManager.renderCards(meusCasos);
    
    CaseManager.onCaseClick((casoClicado) => {
        const index = meusCasos.findIndex(c => c.crime.id === casoClicado.crime.id);
        showGraphView(index);
        
        if (typeof GraphEngine !== 'undefined') {
            GraphEngine.renderGraphForCase(casoClicado);
        }
        
        if (typeof CaseManager.showInspector !== 'undefined') {
            CaseManager.showInspector(null);
        }
    });

    CaseManager.onDeleteCase(async (casoToDelete) => {
        const confirmed = await CustomDialogs.confirm(
            `Tem certeza que deseja excluir o caso "${casoToDelete.crime.titulo}"?`,
            'Excluir Caso'
        );
        if (confirmed) {
            meusCasos = meusCasos.filter(c => c.crime.id !== casoToDelete.crime.id);
            localStorage.setItem(storageKey, JSON.stringify(meusCasos));
            CaseManager.renderCards(meusCasos);
            UI.showNotification('Caso removido!', 'success');
        }
    });

    CaseManager.onRemoveElement((nodeId) => {
        // Nota: O onRemoveElement no CaseManager ainda usa confirm nativo no evento interno.
        // Vou precisar atualizar o caseManager.js também.
        // Mas aqui no dashboard lidamos com a remoção após o callback ser disparado.
        
        if (currentCaseIndex !== null) {
            const caso = meusCasos[currentCaseIndex];
            
            // 1. Remover dos elementos extras se estiver lá
            if (caso.elementosExtras) {
                caso.elementosExtras = caso.elementosExtras.filter(el => el.id !== nodeId);
            }
            
            // 2. Remover conexões manuais que envolvam este nó
            if (caso.conexoesManuais) {
                caso.conexoesManuais = caso.conexoesManuais.filter(edge => edge.from !== nodeId && edge.to !== nodeId);
            }

            // 3. Remover do Grafo Visual
            if (typeof GraphEngine !== 'undefined') {
                GraphEngine.removeNode(nodeId);
            }

            localStorage.setItem(storageKey, JSON.stringify(meusCasos));
            UI.showNotification('Elemento removido!', 'success');
        }
    });

    // ... (onEdgeClick logic below)


    CaseManager.onDataUpdated(() => {
        localStorage.setItem(storageKey, JSON.stringify(meusCasos));
        if (currentCaseIndex !== null && typeof GraphEngine !== 'undefined') {
            GraphEngine.renderGraphForCase(meusCasos[currentCaseIndex]);
        }
        UI.showNotification('Dados atualizados!', 'success');
    });
}

});
