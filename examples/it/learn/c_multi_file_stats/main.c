//Progetto C multifile. stats.c importa le sue dichiarazioni da stats.h.
#include "stats.h"   //l'intestazione dichiara ciò che esiste
#use "stats.c"   //e questa riga introduce il file che lo implementa

int main(void) {
  int values[6] = {3, 5, 8, 2, 11, 13};   //l'array risiede nel frame principale
  print_string("sum=");
  print_int(array_sum(values, 6));   //l'array viene passato come indirizzo, non copiato
  print_char(10);
  print_string("max=");
  print_int(array_max(values, 6));   //stesso array, un'altra funzione dello stesso modulo
  print_char(10);
  return 0;
}
