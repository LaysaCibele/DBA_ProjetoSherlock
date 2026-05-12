import json
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import (CrimeRelacional, PessoaRelacional, LocalRelacional, CasoRelacional,
    Crime, Pessoa, Local)

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
            data.append({
                "id": c.id,
                "crime": {
                    "titulo": c.crime.titulo,
                    "tipo": c.crime.tipo,
                    "data": str(c.crime.data)
                },
                "pessoa": {
                    "nome": c.pessoa.nome,
                    "funcao": c.pessoa.funcao
                },
                "local": {
                    "nome": c.local.nome
                }
            })
        return JsonResponse(data, safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)