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
                        onDataUpdatedCallback(); // Notify coordinator
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
