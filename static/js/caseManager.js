// caseManager.js

const CaseManager = (function() {
    let onCaseClickCallback = null;
    let onDeleteCaseCallback = null;
    let onRemoveElementCallback = null;
    let onDataUpdatedCallback = null;

    function renderCards(meusCasos) {
        const container = document.getElementById('cases-grid-container');
        if (!container) return;

        container.innerHTML = '';

        if (meusCasos.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <i class="ph ph-folder-open"></i>
                    <h2>Bem-vindo à Gestão de Casos</h2>
                    <p style="margin-top: 8px;">Nenhum caso registrado até o momento.<br>Clique em "Novo Caso" para iniciar uma investigação.</p>
                </div>
            `;
            return;
        }

        meusCasos.forEach((caso, index) => {
            const card = document.createElement('div');
            card.className = 'case-card';
            
            card.innerHTML = `
                <div class="case-card-delete" title="Excluir Caso">
                    <i class="ph ph-trash"></i>
                </div>
                <div class="case-card-header">
                    <span class="case-card-id">#${caso.crime.id_crime}</span>
                    <span class="case-card-date"><i class="ph ph-calendar"></i> ${caso.crime.data || 'Sem data'}</span>
                </div>
                <h3 class="case-card-title">${caso.crime.titulo}</h3>
                <div class="case-card-info">
                    <div><i class="ph ph-warning-circle"></i> Tipo: ${caso.crime.tipo || 'Não especificado'}</div>
                    <div><i class="ph ph-map-pin"></i> Local: ${caso.local.nome}</div>
                    <div><i class="ph ph-user"></i> Suspeito: ${caso.pessoa.nome}</div>
                </div>
            `;

            // Delete button listener
            const deleteBtn = card.querySelector('.case-card-delete');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (onDeleteCaseCallback) {
                    onDeleteCaseCallback(caso);
                }
            });

            card.addEventListener('click', () => {
                if (onCaseClickCallback) {
                    onCaseClickCallback(caso);
                }
            });

            container.appendChild(card);
        });
    }

    function onCaseClick(callback) {
        onCaseClickCallback = callback;
    }

    function onDeleteCase(callback) {
        onDeleteCaseCallback = callback;
    }

    function onRemoveElement(callback) {
        onRemoveElementCallback = callback;
    }

    function onDataUpdated(callback) {
        onDataUpdatedCallback = callback;
    }

    function showInspector(elementData) {
        const inspectorContent = document.getElementById('inspector-content');
        if (!inspectorContent) return;

        if (!elementData) {
            inspectorContent.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 16px 0;">Selecione um elemento no grafo para ver e editar seus detalhes.</p>';
            return;
        }

        // Se for uma conexão/edge
        const isEdge = elementData.id && elementData.id.startsWith('rel_');

        if (isEdge) {
            const fromNode = typeof GraphEngine !== 'undefined' && GraphEngine.nodesDataset ? GraphEngine.nodesDataset.get(elementData.from) : null;
            const toNode = typeof GraphEngine !== 'undefined' && GraphEngine.nodesDataset ? GraphEngine.nodesDataset.get(elementData.to) : null;
            
            const fromName = fromNode ? fromNode.label.split('\n')[0] : 'Elemento de Origem';
            const toName = toNode ? toNode.label.split('\n')[0] : 'Elemento de Destino';
            
            let html = `
                <div class="inspector-header-title" style="font-size: 1.1rem; font-weight: 600; margin-bottom: 16px; color: var(--text-primary); border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">
                    <i class="ph ph-git-commit" style="vertical-align: middle; margin-right: 6px;"></i> Detalhes da Conexão
                </div>
                
                <div class="inspector-item">
                    <span class="inspector-label">Origem</span>
                    <div class="inspector-value-container" style="background: rgba(255,255,255,0.02); padding: 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.05);">
                        <span class="inspector-value" style="color: var(--text-secondary);">${fromName}</span>
                    </div>
                </div>
                
                <div class="inspector-item" style="margin-top: 12px;">
                    <span class="inspector-label">Destino</span>
                    <div class="inspector-value-container" style="background: rgba(255,255,255,0.02); padding: 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.05);">
                        <span class="inspector-value" style="color: var(--text-secondary);">${toName}</span>
                    </div>
                </div>
                
                <div class="inspector-item" style="margin-top: 12px;">
                    <span class="inspector-label">Nome da Conexão</span>
                    <div class="inspector-value-container" id="container-label">
                        <span class="inspector-value" id="val-label">${elementData.label}</span>
                        <button class="btn-edit" data-key="label" title="Editar"><i class="ph ph-pencil"></i></button>
                    </div>
                </div>
                
                <div class="inspector-actions" style="margin-top: 24px;">
                    <button id="btn-remover-conexao" class="btn-danger-outline" style="width: 100%;">
                        <i class="ph ph-trash"></i>
                        Remover Conexão
                    </button>
                </div>
            `;
            
            inspectorContent.innerHTML = html;
            
            // Listener para remover conexão
            const removeBtn = document.getElementById('btn-remover-conexao');
            if (removeBtn) {
                removeBtn.addEventListener('click', async () => {
                    const confirmed = await CustomDialogs.confirm(
                        'Deseja realmente remover esta conexão?',
                        'Remover Conexão'
                    );
                    if (confirmed) {
                        if (onRemoveElementCallback) {
                            onRemoveElementCallback(elementData); // Envia o objeto inteiro da conexão
                        }
                    }
                });
            }
            
            // Listener para editar conexão
            const editBtn = inspectorContent.querySelector('.btn-edit');
            if (editBtn) {
                editBtn.addEventListener('click', () => {
                    const container = document.getElementById('container-label');
                    const currentValue = elementData.label || '';
                    
                    container.innerHTML = `
                        <input type="text" class="edit-input" id="input-label" value="${currentValue}" style="width: 100%; box-sizing: border-box;">
                        <button class="btn-save" data-key="label" title="Salvar"><i class="ph ph-check"></i></button>
                    `;
                    
                    const inputElement = document.getElementById('input-label');
                    inputElement.focus();
                    
                    const saveBtn = container.querySelector('.btn-save');
                    
                    const saveAction = () => {
                        const newValue = inputElement.value;
                        elementData.label = newValue;
                        
                        if (onDataUpdatedCallback) {
                            onDataUpdatedCallback(elementData);
                        }
                        
                        showInspector(elementData);
                    };
                    
                    saveBtn.addEventListener('click', saveAction);
                    inputElement.addEventListener('keypress', (event) => {
                        if (event.key === 'Enter') {
                            saveAction();
                        }
                    });
                });
            }
            return;
        }

        let html = '';
        
        Object.keys(elementData).forEach(key => {
            if (key === 'id' || key === 'x' || key === 'y') return; // Do not allow editing ID or coords directly here

            const value = elementData[key] || '';
            
            html += `
                <div class="inspector-item">
                    <span class="inspector-label">${key}</span>
                    <div class="inspector-value-container" id="container-${key}">
                        <span class="inspector-value" id="val-${key}">${value}</span>
                        <button class="btn-edit" data-key="${key}" title="Editar"><i class="ph ph-pencil"></i></button>
                    </div>
                </div>
            `;
        });

        // Add "Remover Elemento" button
        html += `
            <div class="inspector-actions">
                <button id="btn-remover-elemento" class="btn-danger-outline">
                    <i class="ph ph-trash"></i>
                    Remover Elemento
                </button>
            </div>
        `;

        inspectorContent.innerHTML = html;

        // Listener for remove button
        const removeBtn = document.getElementById('btn-remover-elemento');
        if (removeBtn) {
            removeBtn.addEventListener('click', async () => {
                const confirmed = await CustomDialogs.confirm(
                    'Deseja realmente remover este elemento?',
                    'Remover Elemento'
                );
                if (confirmed) {
                    if (onRemoveElementCallback) {
                        onRemoveElementCallback(elementData.id);
                    }
                }
            });
        }


        // Add event listeners for edit buttons
        const editButtons = inspectorContent.querySelectorAll('.btn-edit');
        editButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const key = btn.getAttribute('data-key');
                const container = document.getElementById(`container-${key}`);
                const currentValue = elementData[key] || '';
                
                // Switch to edit mode
                container.innerHTML = `
                    <input type="text" class="edit-input" id="input-${key}" value="${currentValue}">
                    <button class="btn-save" data-key="${key}" title="Salvar"><i class="ph ph-check"></i></button>
                `;
                
                const inputElement = document.getElementById(`input-${key}`);
                inputElement.focus();
                
                const saveBtn = container.querySelector('.btn-save');
                
                const saveAction = () => {
                    const newValue = inputElement.value;
                    elementData[key] = newValue; // Update reference directly
                    
                    if (onDataUpdatedCallback) {
                        onDataUpdatedCallback(elementData); // Notify coordinator with data
                    }
                    
                    // Re-render inspector to go back to read-only mode
                    showInspector(elementData);
                };
                
                saveBtn.addEventListener('click', saveAction);
                inputElement.addEventListener('keypress', (event) => {
                    if (event.key === 'Enter') {
                        saveAction();
                    }
                });
            });
        });
    }

    return {
        renderCards,
        onCaseClick,
        onDeleteCase,
        onRemoveElement,
        showInspector,
        onDataUpdated
    };
})();
