#include "stats.h"   // el módulo se comprueba con sus propias declaraciones

int array_sum(int values[], int length) {   // values llega como puntero al vector de quien llama
  int total = 0;
  for (int i = 0; i < length; i++) {
    total += values[i];   // cada índice se convierte en un cálculo de dirección en MIPS
  }
  return total;
}

int array_max(int values[], int length) {
  int result = values[0];   // empezar en el primer elemento y comparar el resto
  for (int i = 1; i < length; i++) {
    if (values[i] > result) result = values[i];   // una comparación por elemento: este bucle es lineal
  }
  return result;
}
