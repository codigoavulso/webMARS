// Proyecto C con varios archivos. stats.c importa las declaraciones de stats.h.
#include "stats.h"
#use "stats.c"

int main(void) {
  int values[6] = {3, 5, 8, 2, 11, 13};
  print_string("suma=");
  print_int(array_sum(values, 6));
  print_char(10);
  print_string("maximo=");
  print_int(array_max(values, 6));
  print_char(10);
  return 0;
}
