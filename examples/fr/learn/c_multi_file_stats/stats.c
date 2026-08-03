#include "stats.h"   //le module se vérifie par rapport à ses propres déclarations

int array_sum(int values[], int length) {   //les valeurs arrivent sous forme de pointeur vers le tableau de l'appelant
  int total = 0;
  for (int i = 0; i < length; i++) {
    total += values[i];   //chaque index devient un calcul d'adresse dans MIPS
  }
  return total;
}

int array_max(int values[], int length) {
  int result = values[0];   //commencez par le premier élément, puis comparez le reste
  for (int i = 1; i < length; i++) {
    if (values[i] > result) result = values[i];   //une comparaison par élément : cette boucle est linéaire
  }
  return result;
}
