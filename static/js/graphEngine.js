// graphEngine.js

const GraphEngine = (function() {
    let network = null;
    let nodesDataset = new vis.DataSet([]);
    let edgesDataset = new vis.DataSet([]);

    function init() {
        const container = document.getElementById('network-graph');
        if (!container || typeof vis === 'undefined') return;

        const data = {
            nodes: nodesDataset,
            edges: edgesDataset
        };

        const options = {
            nodes: {
                shape: 'dot',
                size: 20,
                font: {
                    color: '#f8fafc',
                    size: 14,
                    face: 'Inter'
                },
                borderWidth: 2,
                shadow: {
                    enabled: true,
                    color: 'rgba(0,0,0,0.5)',
                    size: 10,
                    x: 5,
                    y: 5
                }
            },
            edges: {
                width: 2,
                font: {
                    color: '#94a3b8',
                    size: 11,
                    align: 'top',
                    face: 'Inter',
                    background: '#1e293b',
                    strokeWidth: 0
                },
                color: {
                    color: 'rgba(148, 163, 184, 0.4)',
                    highlight: '#3b82f6'
                },
                smooth: {
                    type: 'continuous'
                }
            },
            groups: {
                case: { color: { background: '#f97316', border: '#ea580c' }, size: 25 },
                suspect: { color: { background: '#3b82f6', border: '#2563eb' } },
                location: { color: { background: '#10b981', border: '#059669' }, shape: 'square' },
                vehicle: { color: { background: '#8b5cf6', border: '#7c3aed' }, shape: 'triangle' },
                weapon: { color: { background: '#ef4444', border: '#dc2626' }, shape: 'triangleDown' }
            },
            physics: {
                enabled: true,
                forceAtlas2Based: {
                    gravitationalConstant: -70,
                    centralGravity: 0.01,
                    springLength: 120,
                    springConstant: 0.08
                },
                maxVelocity: 50,
                solver: 'forceAtlas2Based',
                timestep: 0.35,
                stabilization: { iterations: 150 }
            },
            interaction: {
                hover: true,
                tooltipDelay: 200,
                zoomView: true,
                selectConnectedEdges: false
            },
            manipulation: {
                enabled: false,
                addNode: false,
                addEdge: async function(data, callback) {
                    if (data.from == data.to) {
                        UI.showNotification('Não é possível conectar um nó a ele mesmo.', 'error');
                        callback(null);
                    } else {
                        const label = await CustomDialogs.prompt(
                            'Nova Conexão', 
                            'Digite o tipo de relação entre os elementos:',
                            'Ex: Suspeito de, Local de crime...'
                        );
                        
                        if (label) {
                            data.label = label;
                            callback(data);
                            
                            fetch('/salvar-conexao-manual/', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    from: data.from,
                                    to: data.to,
                                    label: data.label
                                })
                            }).then(response => response.json())
                              .then(res => {
                                  if(!res.success) console.error('Erro ao salvar conexão manual no Neo4j:', res.message);
                              }).catch(err => console.error('Erro no fetch salvar-conexao-manual:', err));

                            if (onManualEdgeAddedCallback) {
                                onManualEdgeAddedCallback(data);
                            }
                        } else {
                            callback(null);
                        }
                        network.disableEditMode();
                    }
                }

            }
        };

        network = new vis.Network(container, data, options);

        // Click Event listener
        network.on('click', function(params) {
            // Se clicou em um nó
            if (params.nodes.length > 0) {
                if (onNodeClickCallback) onNodeClickCallback(params.nodes[0]);
            } 
            // Se clicou em uma aresta (sem nó selecionado)
            else if (params.edges.length > 0) {
                const edgeId = params.edges[0];
                const edgeData = edgesDataset.get(edgeId);
                if (onEdgeClickCallback) onEdgeClickCallback(edgeData);
                if (onNodeClickCallback) onNodeClickCallback(null); // Limpa inspetor
            }
            // Se clicou no vazio
            else {
                if (onNodeClickCallback) onNodeClickCallback(null);
            }
        });

        // Drag End listener for coordinates
        network.on('dragEnd', function(params) {
            if (params.nodes.length > 0) {
                const nodeId = params.nodes[0];
                const position = network.getPositions([nodeId])[nodeId];
                if (onNodePositionChangedCallback) {
                    onNodePositionChangedCallback(nodeId, position.x, position.y);
                }
            }
        });
    }

    let onManualEdgeAddedCallback = null;
    let onNodeClickCallback = null;
    let onEdgeClickCallback = null;
    let onNodePositionChangedCallback = null;

    function onNodeClick(callback) {
        onNodeClickCallback = callback;
    }

    function onEdgeClick(callback) {
        onEdgeClickCallback = callback;
    }

    function onManualEdgeAdded(callback) {
        onManualEdgeAddedCallback = callback;
    }

    function onNodePositionChanged(callback) {
        onNodePositionChangedCallback = callback;
    }


    function enableEdgeMode() {
        if (network) {
            network.addEdgeMode();
        }
    }

    function renderGraphForCase(caso) {
        if (!network) return;

        nodesDataset.clear();
        edgesDataset.clear();

        const { local, crime, pessoa } = caso;
        const hiddenEdges = caso.conexoesOcultas || [];

        const isHidden = (from, to) => {
            return hiddenEdges.some(e => (e.from === from && e.to === to) || (e.from === to && e.to === from));
        };

        // Desativar física se houver nós com coordenadas para evitar "espalhamento" indesejado
        const hasCoords = (local.x !== undefined || crime.x !== undefined || pessoa.x !== undefined);
        network.setOptions({ physics: { enabled: !hasCoords } });

        // Adicionar Nós
        nodesDataset.add([
            {
                id: local.id,
                label: local.endereco ? `${local.nome}\n${local.endereco}` : local.nome,
                group: 'location',
                x: local.x, y: local.y
            },
            {
                id: crime.id,
                label: `Caso #${crime.id_crime}\n${crime.titulo}`,
                group: 'case',
                x: crime.x, y: crime.y
            },
            {
                id: pessoa.id,
                label: pessoa.nome,
                group: 'suspect',
                x: pessoa.x, y: pessoa.y
            }
        ]);

        // Adicionar Arestas da cena principal
        const standardEdges = [
            { from: pessoa.id, to: crime.id, label: pessoa.funcao || 'Envolvido em' },
            { from: crime.id, to: local.id, label: 'Ocorreu em' }
        ];

        standardEdges.forEach(edge => {
            if (!isHidden(edge.from, edge.to)) {
                edgesDataset.add(edge);
            }
        });

        // Adicionar nós e arestas extras
        if (caso.elementosExtras && caso.elementosExtras.length > 0) {
            caso.elementosExtras.forEach(elemento => {
                let nodeGroup = '';
                let edgeLabel = '';

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

                nodesDataset.add({
                    id: elemento.id,
                    label: elemento.nome,
                    group: nodeGroup,
                    x: elemento.x, y: elemento.y
                });

                const from = elemento.tipo === 'pessoa' || elemento.tipo === 'veiculo' || elemento.tipo === 'arma' ? elemento.id : crime.id;
                const to = elemento.tipo === 'pessoa' || elemento.tipo === 'veiculo' || elemento.tipo === 'arma' ? crime.id : elemento.id;

                if (!isHidden(from, to)) {
                    edgesDataset.add({
                        from: from,
                        to: to,
                        label: edgeLabel
                    });
                }
            });
        }

        // Desenhar Conexões Manuais
        if (caso.conexoesManuais && caso.conexoesManuais.length > 0) {
            caso.conexoesManuais.forEach(edge => {
                if (!isHidden(edge.from, edge.to)) {
                    edgesDataset.add(edge);
                }
            });
        }

        setTimeout(() => {
            network.redraw();
            if (!hasCoords) {
                network.fit({ animation: { duration: 1000, easingFunction: 'easeInOutQuad' } });
            }
        }, 100);
    }


    function addExtraNode(nodeData, edgeData) {
        if (!network) return;

        nodesDataset.add(nodeData);
        edgesDataset.add(edgeData);

        network.focus(nodeData.id, {
            scale: 1.2,
            animation: {
                duration: 1000,
                easingFunction: 'easeInOutQuad'
            }
        });
    }

    function removeNode(nodeId) {
        if (!network) return;
        
        // 1. Remove o nó do dataset visual
        nodesDataset.remove(nodeId);
        
        // 2. Filtra e remove APENAS as arestas que saem ou chegam nesse nó específico
        const connectedEdges = edgesDataset.get({
            filter: function (edge) {
                return edge.from === nodeId || edge.to === nodeId;
            }
        });
        const edgeIdsToRemove = connectedEdges.map(edge => edge.id);
        edgesDataset.remove(edgeIdsToRemove);
        
        if (onNodeClickCallback) onNodeClickCallback(null);
    }

    return {
        init,
        renderGraphForCase,
        addExtraNode,
        removeNode,
        enableEdgeMode,
        onManualEdgeAdded,
        onNodeClick,
        onEdgeClick,
        onNodePositionChanged
    };
})();


