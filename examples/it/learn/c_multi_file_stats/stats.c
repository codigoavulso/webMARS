#include "stats.h"   //il modulo si confronta con le proprie dichiarazioni

int array_sum(int values[], int length) {   //value arriva come puntatore all'array del chiamante
  int total = 0;
  for (int i = 0; i < length; i++) {
    total += values[i];   //ogni indice diventa un calcolo dell'indirizzo in MIPS
  }
  return total;
}

int array_max(int values[], int length) {
  int result = values[0];   //inizia dal primo elemento, poi confronta il resto
  for (int i = 1; i < length; i++) {
    if (values[i] > result) result = values[i];   //un confronto per elemento: questo ciclo è lineare
  }
  return result;
}
