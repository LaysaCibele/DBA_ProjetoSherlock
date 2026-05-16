import json
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import (CrimeRelacional, PessoaRelacional, LocalRelacional, CasoRelacional,
    Crime, Pessoa, Local, ObjetoRelacional)
from .graph_db import neo4j_db

def index(request):
    return render(request, 'index.html')

def dashboard(request):
    return render(request, 'dashboard.html')


@csrf_exempt
def criar_caso(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            
            # 1. SALVAR NO BANCO RELACIONAL (Django/SQLite) 
            crime_rel = CrimeRelacional.objects.create(
                titulo=data['crime']['titulo'],
                tipo=data['crime']['tipo'],
                data=data['crime']['data']
            )
            pessoa_rel = PessoaRelacional.objects.create(
                nome=data['pessoa']['nome'],
                cpf=data['pessoa']['cpf'],
                funcao=data['pessoa']['funcao']
            )
            local_rel = LocalRelacional.objects.create(
                nome=data['local']['nome'],
                endereco=data['local'].get('endereco', '')
            )
            
            CasoRelacional.objects.create(
                crime=crime_rel,
                pessoa=pessoa_rel,
                local=local_rel
            )

            # 2. BLOCO DO NEO4J
            neo4j_db.run_query(
                "CREATE (p:Pessoa {id_elemento: $id_pessoa, nome: $nome, funcao: $funcao})",
                {"id_pessoa": f"pessoa_{pessoa_rel.id}", "nome": pessoa_rel.nome, "funcao": pessoa_rel.funcao}
            )
            neo4j_db.run_query(
                "CREATE (c:Crime {id_elemento: $id_crime, titulo: $titulo, tipo: $tipo, data: $data})",
                {"id_crime": f"crime_{crime_rel.id}", "titulo": crime_rel.titulo, "tipo": crime_rel.tipo, "data": str(crime_rel.data)}
            )
            neo4j_db.run_query(
                "CREATE (l:Local {id_elemento: $id_local, nome: $nome})",
                {"id_local": f"local_{local_rel.id}", "nome": local_rel.nome}
            )
            
            neo4j_db.run_query(
                "MATCH (p:Pessoa {id_elemento: $id_pessoa}), (c:Crime {id_elemento: $id_crime}) MERGE (p)-[:ENVOLVIDO_EM]->(c)",
                {"id_pessoa": f"pessoa_{pessoa_rel.id}", "id_crime": f"crime_{crime_rel.id}"}
            )
            neo4j_db.run_query(
                "MATCH (c:Crime {id_elemento: $id_crime}), (l:Local {id_elemento: $id_local}) MERGE (c)-[:OCORREU_EM]->(l)",
                {"id_crime": f"crime_{crime_rel.id}", "id_local": f"local_{local_rel.id}"}
            )

            return JsonResponse({'success': True, 'message': 'Caso persistido no SQLite e Neo4j!'})

        except Exception as e:
            print(f"Erro no Backend: {e}")
            return JsonResponse({'success': False, 'message': str(e)}, status=400)

    return JsonResponse({'success': False}, status=405)


@csrf_exempt
def listar_casos(request):
    try:
        # Busca os casos no SQLite para popular o dashboard.js
        casos = CasoRelacional.objects.select_related('crime', 'pessoa', 'local').all()
        
        data = []
        for c in casos:
            elementos = list(c.objetos.all())
            extras = []
            for obj in elementos:
                extra_data = obj.dados_extras if obj.dados_extras else {}
                extra_item = {
                    "id": f"extra_{obj.tipo}_{obj.id}",
                    "tipo": obj.tipo,
                    "nome": obj.descricao,
                    "x": None,
                    "y": None
                }
                # Merge dynamic fields from JSON
                extra_item.update(extra_data)
                extras.append(extra_item)

            data.append({
                "id": c.id,
                "crime": {
                    "id": f"crime_{c.crime.id}",
                    "id_crime": c.crime.id,
                    "titulo": c.crime.titulo,
                    "tipo": c.crime.tipo,
                    "data": str(c.crime.data)
                },
                "pessoa": {
                    "id": f"pessoa_{c.pessoa.id}",
                    "nome": c.pessoa.nome,
                    "funcao": c.pessoa.funcao
                },
                "local": {
                    "id": f"local_{c.local.id}",
                    "nome": c.local.nome
                },
                "elementosExtras": extras
            })
        return JsonResponse(data, safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
    
    
    
@csrf_exempt
def adicionar_elemento(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            caso_id = data.get('caso_id')
            caso = CasoRelacional.objects.get(id=caso_id)

            novo_objeto = ObjetoRelacional.objects.create(
                tipo=data['tipo'],
                descricao=data['descricao'],
                serial=data.get('serial', ''),
                dados_extras=data.get('dados', {}),
                caso=caso
            )
            
            # Espelhar a criação do nó extra no Neo4j
            try:
                elemento_id = f"extra_{novo_objeto.tipo}_{novo_objeto.id}"
                crime_id = f"crime_{caso.crime.id}"
                
                neo4j_db.run_query(
                    "CREATE (e:ObjetoExtra {id_elemento: $id, tipo: $tipo, nome: $nome})",
                    {"id": elemento_id, "tipo": novo_objeto.tipo, "nome": novo_objeto.descricao}
                )
                
                neo4j_db.run_query(
                    "MATCH (e:ObjetoExtra {id_elemento: $elemento_id}), (c:Crime {id_elemento: $crime_id}) MERGE (e)-[:RELACIONADO_A]->(c)",
                    {"elemento_id": elemento_id, "crime_id": crime_id}
                )
            except Exception as neo_e:
                print(f"Erro ao salvar elemento extra no Neo4j: {neo_e}")

            return JsonResponse({
                'success': True, 
                'id': f"extra_{novo_objeto.tipo}_{novo_objeto.id}", 
                'message': 'Elemento adicionado com sucesso!'
            })
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=400)
    return JsonResponse({'success': False}, status=405)


@csrf_exempt
def atualizar_elemento(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            element_id = data.get('id')
            dados = data.get('dados', {})

            if not element_id:
                return JsonResponse({'success': False, 'message': 'ID não fornecido'}, status=400)

            if element_id.startswith('extra_'):
                # Exemplo: extra_pessoa_5 -> ID é 5
                obj_id = element_id.split('_')[-1]
                obj = ObjetoRelacional.objects.get(id=obj_id)
                
                # Se mudaram o nome/descrição, atualiza a coluna padrão também
                if 'nome' in dados:
                    obj.descricao = dados['nome']
                
                # O restante vai pro dados_extras
                if not obj.dados_extras:
                    obj.dados_extras = {}
                    
                for key, value in dados.items():
                    if key not in ['id', 'x', 'y', 'tipo']:
                        obj.dados_extras[key] = value
                        
                obj.save()
                return JsonResponse({'success': True, 'message': 'Elemento atualizado'})

            elif element_id.startswith('crime_'):
                obj_id = element_id.split('_')[-1]
                obj = CrimeRelacional.objects.get(id=obj_id)
                if 'titulo' in dados: obj.titulo = dados['titulo']
                if 'tipo' in dados: obj.tipo = dados['tipo']
                if 'data' in dados: obj.data = dados['data']
                obj.save()
                return JsonResponse({'success': True, 'message': 'Crime atualizado'})

            elif element_id.startswith('pessoa_'):
                obj_id = element_id.split('_')[-1]
                obj = PessoaRelacional.objects.get(id=obj_id)
                if 'nome' in dados: obj.nome = dados['nome']
                if 'funcao' in dados: obj.funcao = dados['funcao']
                obj.save()
                return JsonResponse({'success': True, 'message': 'Pessoa atualizada'})

            elif element_id.startswith('local_'):
                obj_id = element_id.split('_')[-1]
                obj = LocalRelacional.objects.get(id=obj_id)
                if 'nome' in dados: obj.nome = dados['nome']
                obj.save()
                return JsonResponse({'success': True, 'message': 'Local atualizado'})

            return JsonResponse({'success': False, 'message': 'Tipo de ID desconhecido'}, status=400)
            
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=400)
    return JsonResponse({'success': False}, status=405)


@csrf_exempt
def remover_elemento(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            element_id = data.get('id')

            if not element_id:
                return JsonResponse({'success': False, 'message': 'ID não fornecido'}, status=400)

            # Só permitimos excluir elementos extras (ObjetoRelacional) 
            # para não corromper o Caso principal
            if element_id.startswith('extra_'):
                obj_id = element_id.split('_')[-1]
                ObjetoRelacional.objects.filter(id=obj_id).delete()
                
                # Sincronizar com o Neo4j removendo o nó e todos os seus relacionamentos (DETACH DELETE)
                try:
                    neo4j_db.run_query(
                        "MATCH (e {id_elemento: $id_deletado}) DETACH DELETE e",
                        {"id_deletado": element_id}
                    )
                except Exception as neo_e:
                    print(f"Erro ao deletar elemento extra no Neo4j: {neo_e}")

                return JsonResponse({'success': True, 'message': 'Elemento extra removido'})
            else:
                return JsonResponse({'success': False, 'message': 'Não é possível remover elementos principais do caso por aqui. Exclua o caso inteiro.'}, status=400)
                
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=400)
    return JsonResponse({'success': False}, status=405)


@csrf_exempt
def salvar_conexao_manual(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            from_node = data.get('from')
            to_node = data.get('to')
            label = data.get('label')

            # Criação do relacionamento usando Cypher
            query = "MATCH (a {id_elemento: $from}), (b {id_elemento: $to}) MERGE (a)-[r:VINCULO {tipo: $label}]->(b) RETURN r"
            neo4j_db.run_query(query, {"from": from_node, "to": to_node, "label": label})

            return JsonResponse({'success': True, 'message': 'Conexão manual salva no Neo4j'})
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=400)
    return JsonResponse({'success': False}, status=405)