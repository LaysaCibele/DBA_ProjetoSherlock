from django.db import models

from neomodel import StructuredNode, StringProperty, DateProperty, RelationshipTo


class LocalRelacional(models.Model):
    nome = models.CharField(max_length=255)
    endereco = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.nome
    
class PessoaRelacional(models.Model):
    nome = models.CharField(max_length=255)
    cpf = models.CharField(max_length=14, unique=True)
    funcao = models.CharField(max_length=100)
    
    def __str__(self):
        return self.nome

class CrimeRelacional(models.Model):
    titulo = models.CharField(max_length=255)
    tipo = models.CharField(max_length=100)
    data = models.DateField()
    
    def __str__(self):
        return self.titulo

class CasoRelacional(models.Model):
    # Este model é o que o dashboard.js vai listar 
    crime = models.ForeignKey(CrimeRelacional, on_delete=models.CASCADE)
    pessoa = models.ForeignKey(PessoaRelacional, on_delete=models.CASCADE)
    local = models.ForeignKey(LocalRelacional, on_delete=models.CASCADE)
    data_registro = models.DateTimeField(auto_now_add=True)
    
    
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
    
    
class ObjetoRelacional(models.Model):
    tipo = models.CharField(max_length=100) 
    descricao = models.TextField()
    serial = models.CharField(max_length=255, blank=True, null=True) # Placa ou numeração
    # JSONField para armazenar todas as características extras (cpf, status, placa, etc)
    dados_extras = models.JSONField(blank=True, null=True, default=dict)
    # Vinculamos ao Caso para saber a qual investigação esse objeto pertence
    caso = models.ForeignKey(CasoRelacional, on_delete=models.CASCADE, related_name='objetos')

    def __str__(self):
        return f"{self.tipo} - {self.descricao[:20]}"