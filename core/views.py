from django.shortcuts import render
from django.http import JsonResponse
from datetime import date
from .models import Pessoa, Crime, Local, Objeto

def index(request):
    return JsonResponse({"status": "API Sherlock Operacional", "banco": "Neo4j Aura"})

def popular_banco(request):
    try:
        # --- CASO 1: HOMICÍDIO (Boa Vista) ---
        luiz = Pessoa(nome="Luiz", cpf="124.356.879-00", funcao="Atirador", status="Investigado").save()
        ana = Pessoa(nome="Ana", cpf="112.334.556-78", funcao="Vítima", status="Morta").save()
        crime_h = Crime(id_crime="CRIME-336", titulo="Morte em casa", data=date(2025, 8, 10), tipo="Homicídio").save()
        arma_h = Objeto(tipo="Arma", descricao="Carabina CBC", serial="ARM-23980").save()
        local_h = Local(nome="Residência da vítima", tipo="Cena do crime", endereco="R. Matheus Torto, 190 - Boa Vista").save()

        luiz.cometeu.connect(crime_h)
        ana.foi_vitima_de.connect(crime_h)
        crime_h.ocorreu_em.connect(local_h)
        crime_h.utilizou.connect(arma_h)

        # --- CASO 2: ROUBO (Mustardinha) ---
        carlos = Pessoa(nome="Carlos", cpf="001.344.566-21", funcao="Motorista", status="Foragido").save()
        marina = Pessoa(nome="Marina", cpf="098.765.432-11", funcao="Chefe", status="Foragida").save()
        crime_r = Crime(id_crime="CRIME-297", titulo="Assalto à Joalheria", data=date(2026, 1, 9), tipo="Roubo").save()
        carro_r = Objeto(tipo="Carro", descricao="Corola preto/azul", serial="LBJ3176").save()
        arma_r = Objeto(tipo="Arma", descricao="Pistola .380", serial="ARM-22538").save()
        local_r = Local(nome="Joalheria Brilhante", tipo="Cena do crime", endereco="R. Morador Barco, 1790 - Mustardinha").save()

        carlos.cometeu.connect(crime_r)
        marina.cometeu.connect(crime_r)
        carlos.usou.connect(carro_r)
        marina.usou.connect(arma_r)
        crime_r.ocorreu_em.connect(local_r)

        # --- CASO 3: SEQUESTRO (Areias) ---
        gilberto = Pessoa(nome="Gilberto", cpf="123.654.937-81", funcao="Sequestrador", status="Investigado").save()
        amanda = Pessoa(nome="Amanda", cpf="371.456.982-03", funcao="Vítima", status="Viva").save()
        crime_s = Crime(id_crime="CRIME-148", titulo="Rapto no mercado", data=date(2023, 5, 12), tipo="Sequestro").save()
        arma_s = Objeto(tipo="Arma de fogo", descricao="Pistola .380", serial="ARM-38045").save()
        local_s = Local(nome="Mix Mateus", tipo="Cena do crime", endereco="R. Dominguinhos Peixoto, 360 - Areias").save()

        gilberto.cometeu.connect(crime_s)
        amanda.foi_vitima_de.connect(crime_s)
        crime_s.ocorreu_em.connect(local_s)
        crime_s.utilizou.connect(arma_s)

        return JsonResponse({"mensagem": "Caso de Homicídio, Roubo e Sequestro cadastrados com sucesso no Neo4j!"})
    
    except Exception as e:
        return JsonResponse({"erro": str(e)})
