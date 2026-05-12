from django.urls import path
from . import views

urlpatterns = [
    path('cadastrar/', views.cadastrar_pm, name='cadastrar_pm'),
    path('login/', views.login_pm, name='login_pm'),
]