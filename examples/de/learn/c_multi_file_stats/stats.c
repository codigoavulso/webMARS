#include "stats.h"   //Das Modul prüft sich selbst anhand seiner eigenen Deklarationen

int array_sum(int values[], int length) {   //Die Werte kommen als Zeiger auf das Array des Aufrufers an
  int total = 0;
  for (int i = 0; i < length; i++) {
    total += values[i];   //Jeder Index wird zu einer Adressberechnung in MIPS
  }
  return total;
}

int array_max(int values[], int length) {
  int result = values[0];   //Beginnen Sie mit dem ersten Element und vergleichen Sie dann den Rest
  for (int i = 1; i < length; i++) {
    if (values[i] > result) result = values[i];   //ein Vergleich pro Element: Diese Schleife ist linear
  }
  return result;
}
