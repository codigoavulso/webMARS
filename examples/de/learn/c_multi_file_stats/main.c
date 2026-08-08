//C-Projekt mit mehreren Dateien. stats.c importiert seine Deklarationen aus stats.h.
#include "stats.h"   //Der Header deklariert, was existiert
#use "stats.c"   //und diese Zeile bringt die Datei ein, die es implementiert

int main(void) {
  int values[6] = {3, 5, 8, 2, 11, 13};   //Das Array befindet sich im Hauptrahmen
  print_string("sum=");
  print_int(array_sum(values, 6));   //Das Array wird als Adresse übergeben und nicht kopiert
  print_char(10);
  print_string("max=");
  print_int(array_max(values, 6));   //dasselbe Array, eine andere Funktion aus demselben Modul
  print_char(10);
  return 0;
}
