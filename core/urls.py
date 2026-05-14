from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('dashboard/', views.dashboard, name='dashboard'),
    
    path('criar-caso/', views.criar_caso, name='criar_caso'),
    path('listar-casos/', views.listar_casos, name='listar_casos'),
    path('listar-casos/', views.listar_casos, name='listar-casos'),
    path('criar-caso/', views.criar_caso, name='criar-caso'),
    path('adicionar-elemento/', views.adicionar_elemento, name='adicionar-elemento'),
    path('atualizar-elemento/', views.atualizar_elemento, name='atualizar-elemento'),
    path('remover-elemento/', views.remover_elemento, name='remover-elemento'),
]

