import json
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import (CrimeRelacional, PessoaRelacional, LocalRelacional, CasoRelacional,
    Crime, Pessoa, Local, ObjetoRelacional)

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

            # 2. BLOCO DO NEO4J (COMENTADO PARA EVITAR ERRO DE CONEXÃO)
            """ 
            n_crime = Crime(id_crime=str(crime_rel.id), titulo=crime_rel.titulo).save()
            n_pessoa = Pessoa(nome=pessoa_rel.nome, cpf=pessoa_rel.cpf).save()
            n_local = Local(nome=local_rel.nome).save()

            n_pessoa.cometeu.connect(n_crime)
            n_crime.ocorreu_em.connect(n_local)
            """

            return JsonResponse({'success': True, 'message': 'Caso persistido no SQLite!'})

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
                return JsonResponse({'success': True, 'message': 'Elemento extra removido'})
            else:
                return JsonResponse({'success': False, 'message': 'Não é possível remover elementos principais do caso por aqui. Exclua o caso inteiro.'}, status=400)
                
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=400)
    return JsonResponse({'success': False}, status=405)