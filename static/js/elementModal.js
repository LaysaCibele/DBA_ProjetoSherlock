// elementModal.js

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

        btnSalvar.addEventListener('click', () => {
            // Bloquear botão
            btnSalvar.disabled = true;

            const tipo = selectTipo.value;
            let id = document.getElementById('add-elemento-id').value;

            if (!id) {
                id = Date.now() + Math.floor(Math.random() * 1000);
            } else {
                id = parseInt(id);
            }

            const elemento = {
                id: id,
                tipo: tipo
            };

            // Coletar dados dinâmicos
            const inputs = document.querySelectorAll('#dynamic-fields-container .dynamic-input');
            let hasError = false;

            inputs.forEach(input => {
                const key = input.getAttribute('data-key');
                const value = input.value.trim();
                
                if (input.hasAttribute('required') && !value) {
                    hasError = true;
                }
                
                if (value) {
                    elemento[key] = value;
                }
            });

            if (hasError) {
                UI.showNotification('Preencha os campos obrigatórios (*).', 'error');
                btnSalvar.disabled = false;
                return;
            }

            // Lógica do Label Principal (para o Vis.js)
            if (tipo === 'pessoa') {
                elemento.nome = elemento.nome || 'Desconhecido';
            } else if (tipo === 'veiculo') {
                elemento.nome = elemento.placa || 'Sem Placa';
            } else if (tipo === 'arma') {
                elemento.nome = [elemento.tipo_arma, elemento.calibre].filter(Boolean).join(' ') || 'Arma Branca';
            } else if (tipo === 'local') {
                elemento.nome = elemento.nome_local || 'Local Não Informado';
            }

            if (onSaveCallback) {
                onSaveCallback(elemento);
            }

            closeModal();
        });
    }

    function onSave(callback) {
        onSaveCallback = callback;
    }

    return {
        init,
        onSave
    };
})();
