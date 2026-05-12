// wizard.js - Versão Integrada com Django
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

        const closeModal = () => {
            modal.classList.remove('active');
            document.querySelectorAll('.form-control').forEach(input => input.value = '');
            if (btnFinalizar) btnFinalizar.disabled = false;
        };

        btnClose.addEventListener('click', closeModal);
        btnCancelar.addEventListener('click', closeModal);

        const validateStep = (step) => {
            let isValid = true;
            if (step === 1) {
                if (!document.getElementById('local-nome').value) isValid = false;
            } else if (step === 2) {
                // Removi a obrigatoriedade do id_crime manual, o Django cuida do ID
                if (!document.getElementById('crime-titulo').value) isValid = false;
            } else if (step === 3) {
                if (!document.getElementById('pessoa-nome').value) isValid = false;
            }
            
            if (!isValid) {
                UI.showNotification('Preencha os campos obrigatórios (*) para avançar.', 'error');
            }
            return isValid;
        };

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

        btnFinalizar.addEventListener('click', () => {
            if (!validateStep(3)) return;

            btnFinalizar.disabled = true;

            // O PAYLOAD AGORA É LIMPO: O Django que vai gerar os IDs
            const payload = {
                local: {
                    nome: document.getElementById('local-nome').value,
                    endereco: document.getElementById('local-endereco').value,
                    tipo: document.getElementById('local-tipo').value
                },
                crime: {
                    titulo: document.getElementById('crime-titulo').value,
                    data: document.getElementById('crime-data').value,
                    tipo: document.getElementById('crime-tipo').value
                },
                pessoa: {
                    nome: document.getElementById('pessoa-nome').value,
                    cpf: document.getElementById('pessoa-cpf').value,
                    funcao: document.getElementById('pessoa-funcao').value,
                    status: document.getElementById('pessoa-status').value
                }
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

    return { init, onSave };
})();
