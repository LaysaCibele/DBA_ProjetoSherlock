from django.db import models
from django.contrib.auth.models import User

# Create your models here.

class PerfilPolicial(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    matricula = models.CharField(max_length=20, unique=True)
    distrito = models.CharField(max_length=100)

    def __str__(self):
        return f"{self.user.username} - {self.matricula}"