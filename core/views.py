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
            
            # 1. Salva no SQLite
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
            
            caso_db = CasoRelacional.objects.create(
                crime=crime_rel,
                pessoa=pessoa_rel,
                local=local_rel
            )

            # 2. Salva no Neo4j de forma segura
            try:
                id_crime = f"crime_{crime_rel.id}"
                id_pessoa = f"pessoa_{pessoa_rel.id}"
                id_local = f"local_{local_rel.id}"
                
                query = """
                CREATE (c:Crime {id_elemento: $id_crime, id_crime: $id_rel, titulo: $titulo, tipo: $tipo, data: $data_c})
                CREATE (p:Pessoa {id_elemento: $id_pessoa, nome: $nome, funcao: $funcao})
                CREATE (l:Local {id_elemento: $id_local, nome: $nome_l})
                MERGE (p)-[:ENVOLVIDO_EM]->(c)
                MERGE (c)-[:OCORREU_EM]->(l)
                """
                
                neo4j_db.run_query(query, {
                    "id_crime": id_crime, "id_rel": str(crime_rel.id), "titulo": crime_rel.titulo, "tipo": crime_rel.tipo, "data_c": str(crime_rel.data),
                    "id_pessoa": id_pessoa, "nome": pessoa_rel.nome, "funcao": pessoa_rel.funcao,
                    "id_local": id_local, "nome_l": local_rel.nome
                })
            except Exception as neo_err:
                print(f"Erro Neo4j (Caso continuará salvo no SQLite): {neo_err}")

            return JsonResponse({'success': True, 'message': 'Caso cadastrado!'})
        except Exception as e:
            print(f"Erro Crítico no Backend: {e}")
            return JsonResponse({'success': False, 'message': str(e)}, status=400)
    return JsonResponse({'success': False}, status=405)


@csrf_exempt
def listar_casos(request):
    try:
        # Busca todas as conexões manuais do Neo4j de uma vez para evitar N+1
        manual_edges = []
        try:
            query = "MATCH (a)-[r:VINCULO]->(b) RETURN a.id_elemento AS from, b.id_elemento AS to, r.tipo AS label"
            manual_edges = neo4j_db.run_query(query)
        except Exception as neo_err:
            print(f"Aviso Neo4j: {neo_err}")

        # Busca os casos no SQLite para popular o dashboard.js
        casos = CasoRelacional.objects.select_related('crime', 'pessoa', 'local').all()
        
        data = []
        for c in casos:
            elementos = list(c.objetos.all())
            extras = []
            case_node_ids = { f"crime_{c.crime.id}", f"pessoa_{c.pessoa.id}", f"local_{c.local.id}" }
            
            for obj in elementos:
                extra_data = obj.dados_extras if obj.dados_extras else {}
                extra_id = f"extra_{obj.tipo}_{obj.id}"
                extra_item = {
                    "id": extra_id,
                    "tipo": obj.tipo,
                    "nome": obj.descricao,
                    "x": None,
                    "y": None
                }
                # Merge dynamic fields from JSON
                extra_item.update(extra_data)
                extras.append(extra_item)
                case_node_ids.add(extra_id)

            # Filtra as conexões manuais que pertencem aos nós deste caso
            case_edges = [edge for edge in manual_edges if edge['from'] in case_node_ids and edge['to'] in case_node_ids]

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
                "elementosExtras": extras,
                "conexoesManuais": case_edges
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


@csrf_exempt
def deletar_caso(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            caso_id = data.get('id')
            
            caso = CasoRelacional.objects.get(id=caso_id)
            crime_id = caso.crime.id
            pessoa_id = caso.pessoa.id
            local_id = caso.local.id
            
            # 1. Deleta o nó do Crime correspondente e tudo ligado a ele no Neo4j AuraDB
            query = "MATCH (c:Crime {id_elemento: $id}) DETACH DELETE c"
            neo4j_db.run_query(query, {"id": f"crime_{crime_id}"})
            
            # 2. Deleta do SQLite limpando os registros atrelados
            caso.delete()
            CrimeRelacional.objects.filter(id=crime_id).delete()
            PessoaRelacional.objects.filter(id=pessoa_id).delete()
            LocalRelacional.objects.filter(id=local_id).delete()
            
            return JsonResponse({'success': True})
        except Exception as e:
            print(f"Erro ao deletar caso: {e}")
            return JsonResponse({'success': False, 'message': str(e)}, status=400)
    return JsonResponse({'success': False}, status=405)