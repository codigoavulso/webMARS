#include "stats.h"   //moduł sprawdza się względem własnych deklaracji

int array_sum(int values[], int length) {   //wartości docierają jako wskaźnik do tablicy obiektu wywołującego
  int total = 0;
  for (int i = 0; i < length; i++) {
    total += values[i];   //każdy indeks staje się obliczeniem adresu w MIPS
  }
  return total;
}

int array_max(int values[], int length) {
  int result = values[0];   //zacznij od pierwszego elementu, a następnie porównaj resztę
  for (int i = 1; i < length; i++) {
    if (values[i] > result) result = values[i];   //jedno porównanie na element: ta pętla jest liniowa
  }
  return result;
}
