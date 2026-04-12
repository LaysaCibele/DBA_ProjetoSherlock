from django.db import models

from neomodel import StructuredNode, StringProperty, DateProperty, RelationshipTo

# --- 1. LOCAIS E OBJETOS ---
class Local(StructuredNode):
    nome = StringProperty(required=True)
    tipo = StringProperty()       # Cena do crime
    endereco = StringProperty()

class Objeto(StructuredNode):
    tipo = StringProperty()       # Arma, Carro...
    descricao = StringProperty()
    serial = StringProperty()     # Placa ou numeração

# --- 2. CRIMES ---
class Crime(StructuredNode):
    id_crime = StringProperty(required=True, unique_index=True)
    titulo = StringProperty()
    data = DateProperty()
    tipo = StringProperty()       # tipo: Homicídio, Roubo, Sequestro
    
    # Ligações que saem do Crime:
    ocorreu_em = RelationshipTo(Local, 'OCORREU_EM')
    utilizou = RelationshipTo(Objeto, 'UTILIZOU')

# --- 3. PESSOAS ---
class Pessoa(StructuredNode):
    nome = StringProperty(required=True)
    cpf = StringProperty()
    funcao = StringProperty()     # Atirador, Vítima, Chefe
    status = StringProperty()     # Investigado, Morta, Foragido
    
    # Ligações que saem da Pessoa:
    cometeu = RelationshipTo(Crime, 'COMETEU')
    foi_vitima_de = RelationshipTo(Crime, 'FOI_VITIMA_DE')
    usou = RelationshipTo(Objeto, 'USOU')
    conhece = RelationshipTo('Pessoa', 'CONHECE')