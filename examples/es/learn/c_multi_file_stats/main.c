// Proyecto C con varios archivos. stats.c importa las declaraciones de stats.h.
#include "stats.h"   // la cabecera declara lo que existe
#use "stats.c"   // y esta línea trae el archivo que lo implementa

int main(void) {
  int values[6] = {3, 5, 8, 2, 11, 13};   // el vector vive en el marco de main
  print_string("suma=");
  print_int(array_sum(values, 6));   // el vector se pasa como dirección, no se copia
  print_char(10);
  print_string("maximo=");
  print_int(array_max(values, 6));   // el mismo vector, otra función del mismo módulo
  print_char(10);
  return 0;
}
