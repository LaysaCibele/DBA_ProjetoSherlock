// elementModal.js - Versão Integrada com Django
const ElementModal = (function() {
    let onSaveCallback = null;

    const fieldsMapping = {
        pessoa: [
            { id: 'nome', label: 'Nome', placeholder: 'Ex: João da Silva', required: true },
            { id: 'cpf', label: 'CPF', placeholder: '000.000.000-00', required: false },
            { id: 'funcao', label: 'Função / Vínculo', placeholder: 'Ex: Vítima, Suspeito...', required: false }
        ],
        veiculo: [
            { id: 'placa', label: 'Placa', placeholder: 'AAA-0000', required: true },
            { id: 'modelo', label: 'Modelo', placeholder: 'Ex: Fiat Uno', required: false },
            { id: 'cor', label: 'Cor', placeholder: 'Ex: Prata', required: false }
        ],
        arma: [
            { id: 'tipo_arma', label: 'Tipo de Arma', placeholder: 'Ex: Pistola, Faca...', required: true },
            { id: 'calibre', label: 'Calibre', placeholder: 'Ex: 9mm', required: false },
            { id: 'numeracao', label: 'Numeração de Série', placeholder: 'Ex: 123456789', required: false }
        ],
        local: [
            { id: 'nome_local', label: 'Nome do Local', placeholder: 'Ex: Bar do Zé', required: true },
            { id: 'endereco', label: 'Endereço', placeholder: 'Ex: Rua X, 123', required: false }
        ]
    };

    function renderDynamicFields(tipo) {
        const container = document.getElementById('dynamic-fields-container');
        if (!container) return;
        
        container.innerHTML = '';
        const fields = fieldsMapping[tipo] || fieldsMapping['pessoa'];

        fields.forEach(field => {
            const div = document.createElement('div');
            div.className = 'form-group';
            div.innerHTML = `
                <label for="add-elemento-${field.id}">${field.label} ${field.required ? '*' : ''}</label>
                <input type="text" id="add-elemento-${field.id}" class="form-control dynamic-input" data-key="${field.id}" placeholder="${field.placeholder}" ${field.required ? 'required' : ''}>
            `;
            container.appendChild(div);
        });
    }

    function init() {
        const modal = document.getElementById('modal-add-elemento');
        const btnClose = document.getElementById('close-add-elemento');
        const btnCancelar = document.getElementById('btn-cancelar-elemento');
        const btnSalvar = document.getElementById('btn-salvar-elemento');
        const selectTipo = document.getElementById('select-tipo-elemento');

        if (!modal) return;

        selectTipo.addEventListener('change', (e) => {
            renderDynamicFields(e.target.value);
        });

        ElementModal.open = () => {
            modal.classList.add('active');
            selectTipo.value = 'pessoa';
            document.getElementById('add-elemento-id').value = '';
            renderDynamicFields('pessoa');
            if (btnSalvar) btnSalvar.disabled = false;
        };

        const closeModal = () => {
            modal.classList.remove('active');
            if (btnSalvar) btnSalvar.disabled = false;
        };

        btnClose.addEventListener('click', closeModal);
        btnCancelar.addEventListener('click', closeModal);

        // --- INTEGRAÇÃO COM DJANGO ---
        btnSalvar.addEventListener('click', async () => {
            btnSalvar.disabled = true;

            const tipo = selectTipo.value;
            const elementoData = {};

            // Coletar dados dos campos dinâmicos
            const inputs = document.querySelectorAll('#dynamic-fields-container .dynamic-input');
            let hasError = false;

            inputs.forEach(input => {
                const key = input.getAttribute('data-key');
                const value = input.value.trim();
                if (input.hasAttribute('required') && !value) hasError = true;
                if (value) elementoData[key] = value;
            });

            if (hasError) {
                UI.showNotification('Preencha os campos obrigatórios (*).', 'error');
                btnSalvar.disabled = false;
                return;
            }

            // Preparar o payload para o Django
            // Usamos window.currentCaseId que deve ser definido no dashboard.js ao abrir o grafo
            const payload = {
                caso_id: window.currentCaseId,
                tipo: tipo,
                descricao: elementoData.nome || elementoData.modelo || elementoData.tipo_arma || elementoData.nome_local || "Elemento extra",
                serial: elementoData.placa || elementoData.numeracao || elementoData.cpf || elementoData.endereco || ""
            };

            try {
                const response = await fetch('/adicionar-elemento/', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();

                if (data.success) {
                    UI.showNotification('Elemento salvo no banco SQLite!', 'success');
                    
                    // Callback para atualizar o grafo visualmente no GraphEngine
                    if (onSaveCallback) {
                        onSaveCallback({ ...elementoData, id: data.id, tipo: tipo });
                    }
                    closeModal();
                } else {
                    UI.showNotification('Erro: ' + data.message, 'error');
                    btnSalvar.disabled = false;
                }
            } catch (error) {
                console.error('Erro ao salvar elemento:', error);
                UI.showNotification('Erro de conexão com o servidor.', 'error');
                btnSalvar.disabled = false;
            }
        });
    }

    function onSave(callback) {
        onSaveCallback = callback;
    }

    return { init, onSave };
})();