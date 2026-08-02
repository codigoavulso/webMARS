#include "stats.h"   // o módulo confere-se com as suas próprias declarações

int array_sum(int values[], int length) {   // values chega como apontador para o vetor de quem chamou
  int total = 0;
  for (int i = 0; i < length; i++) {
    total += values[i];   // cada índice torna-se um cálculo de endereço em MIPS
  }
  return total;
}

int array_max(int values[], int length) {
  int result = values[0];   // começar no primeiro elemento e comparar os restantes
  for (int i = 1; i < length; i++) {
    if (values[i] > result) result = values[i];   // uma comparação por elemento: este ciclo é linear
  }
  return result;
}
