//Projet C multi-fichiers. stats.c importe ses déclarations depuis stats.h.
#include "stats.h"   //l'en-tête déclare ce qui existe
#use "stats.c"   //et cette ligne amène le fichier qui l'implémente

int main(void) {
  int values[6] = {3, 5, 8, 2, 11, 13};   //le tableau vit dans le cadre principal
  print_string("sum=");
  print_int(array_sum(values, 6));   //le tableau est passé comme adresse, pas copié
  print_char(10);
  print_string("max=");
  print_int(array_max(values, 6));   //même tableau, une autre fonction du même module
  print_char(10);
  return 0;
}
