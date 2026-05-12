import json
from django.shortcuts import render
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import PerfilPolicial
# Create your views here.


@csrf_exempt
def cadastrar_pm(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        if User.objects.filter(username=data['matricula']).exists():
            return JsonResponse({'success': False, 'message': 'Matrícula já cadastrada.'}, status=400)
        
        user = User.objects.create_user(
            username=data['matricula'], 
            password=data['senha'],
            first_name=data['nome']
        )
        PerfilPolicial.objects.create(
            user=user, 
            matricula=data['matricula'], 
            distrito=data['distrito']
        )
        return JsonResponse({'success': True})

@csrf_exempt
def login_pm(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        user = authenticate(username=data['matricula'], password=data['senha'])
        if user:
            login(request, user)
            perfil = user.perfilpolicial
            return JsonResponse({
                'success': True,
                'user': {
                    'nome': user.first_name,
                    'matricula': perfil.matricula,
                    'distrito': perfil.distrito
                }
            })
        return JsonResponse({'success': False, 'message': 'Credenciais inválidas.'}, status=401)