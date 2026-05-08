from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

def index(request):
    return render(request, 'index.html')

def dashboard(request):
    return render(request, 'dashboard.html')



@csrf_exempt
def criar_caso(request):
    if request.method == 'POST':
        data = json.loads(request.body)

        print(data)

        return JsonResponse({
            'success': True,
            'message': 'Caso criado com sucesso'
        })

    return JsonResponse({'success': False})


@csrf_exempt
def listar_casos(request):
    return JsonResponse([], safe=False)