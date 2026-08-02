// Projeto C multificheiro. stats.c importa as declaracoes de stats.h.
#include "stats.h"   // o cabeçalho declara o que existe
#use "stats.c"   // e esta linha traz o ficheiro que o implementa

int main(void) {
  int values[6] = {3, 5, 8, 2, 11, 13};   // o vetor vive no frame de main
  print_string("soma=");
  print_int(array_sum(values, 6));   // o vetor é passado como endereço, não copiado
  print_char(10);
  print_string("maximo=");
  print_int(array_max(values, 6));   // o mesmo vetor, outra função do mesmo módulo
  print_char(10);
  return 0;
}
