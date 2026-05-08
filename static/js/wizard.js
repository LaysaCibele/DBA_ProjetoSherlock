// wizard.js

const Wizard = (function() {
    let onSaveCallback = null;

    let currentStep = 1;
    const totalSteps = 3;

    function init() {
        const modal = document.getElementById('cadastro-modal');
        const btnClose = document.getElementById('close-modal');
        const btnCancelar = document.getElementById('btn-cancelar');
        
        const btnProximo = document.getElementById('btn-proximo');
        const btnVoltar = document.getElementById('btn-voltar');
        const btnFinalizar = document.getElementById('btn-finalizar');

        if (!modal) return;

        Wizard.open = () => {
            modal.classList.add('active');
            goToStep(1);
            if (btnFinalizar) btnFinalizar.disabled = false;
        };

        // Close Modal
        const closeModal = () => {
            modal.classList.remove('active');
            document.querySelectorAll('.form-control').forEach(input => input.value = '');
            if (btnFinalizar) btnFinalizar.disabled = false;
        };

        btnClose.addEventListener('click', closeModal);
        btnCancelar.addEventListener('click', closeModal);

        // Validation logic
        const validateStep = (step) => {
            let isValid = true;
            if (step === 1) {
                if (!document.getElementById('local-nome').value) isValid = false;
            } else if (step === 2) {
                if (!document.getElementById('crime-id_crime').value) isValid = false;
                if (!document.getElementById('crime-titulo').value) isValid = false;
            } else if (step === 3) {
                if (!document.getElementById('pessoa-nome').value) isValid = false;
            }
            
            if (!isValid) {
                UI.showNotification('Preencha os campos obrigatórios (*) para avançar.', 'error');
            }
            return isValid;
        };

        // Navigate Steps
        const goToStep = (step) => {
            const progressFill = document.getElementById('progress-fill');
            const stepIndicators = document.querySelectorAll('.progress-steps .step');

            document.querySelectorAll('.wizard-step').forEach(el => el.style.display = 'none');
            document.getElementById(`step-${step}`).style.display = 'block';
            
            if (btnVoltar) btnVoltar.style.display = step === 1 ? 'none' : 'block';
            
            if (step === totalSteps) {
                btnProximo.style.display = 'none';
                btnFinalizar.style.display = 'flex';
            } else {
                btnProximo.style.display = 'block';
                btnFinalizar.style.display = 'none';
            }
            
            if (progressFill) progressFill.style.width = `${(step / totalSteps) * 100}%`;
            
            stepIndicators.forEach((ind, index) => {
                if (index < step) ind.classList.add('active');
                else ind.classList.remove('active');
            });
            
            currentStep = step;
        };

        btnProximo.addEventListener('click', () => {
            if (validateStep(currentStep)) goToStep(currentStep + 1);
        });

        if (btnVoltar) {
            btnVoltar.addEventListener('click', () => {
                if (currentStep > 1) goToStep(currentStep - 1);
            });
        }

        // Finalize
        btnFinalizar.addEventListener('click', () => {
            if (!validateStep(3)) {
                if (btnFinalizar) btnFinalizar.disabled = false;
                return;
            }

            // Bloquear botão para evitar duplicidade
            btnFinalizar.disabled = true;

            const generateId = () => Date.now() + Math.floor(Math.random() * 1000);

            const localData = {
                id: document.getElementById('local-id').value ? parseInt(document.getElementById('local-id').value) : generateId(),
                nome: document.getElementById('local-nome').value,
                endereco: document.getElementById('local-endereco').value,
                tipo: document.getElementById('local-tipo').value
            };

            const crimeData = {
                id: document.getElementById('crime-id').value ? parseInt(document.getElementById('crime-id').value) : generateId(),
                id_crime: document.getElementById('crime-id_crime').value,
                titulo: document.getElementById('crime-titulo').value,
                data: document.getElementById('crime-data').value,
                tipo: document.getElementById('crime-tipo').value
            };

            const pessoaData = {
                id: document.getElementById('pessoa-id').value ? parseInt(document.getElementById('pessoa-id').value) : generateId(),
                nome: document.getElementById('pessoa-nome').value,
                cpf: document.getElementById('pessoa-cpf').value,
                funcao: document.getElementById('pessoa-funcao').value,
                status: document.getElementById('pessoa-status').value
            };

            // Capturar o distrito do policial logado
            let distrito = 'Desconhecido';
            const savedUserJson = localStorage.getItem('currentUser');
            if (savedUserJson) {
                const user = JSON.parse(savedUserJson);
                if (user.distrito) {
                    distrito = user.distrito;
                }
            }

            const payload = {
                transactionType: 'CREATE_SCENE',
                distritoOrigem: distrito,
                local: localData,
                crime: crimeData,
                pessoa: pessoaData
            };

            if (onSaveCallback) {
                onSaveCallback(payload);
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
