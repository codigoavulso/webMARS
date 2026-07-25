// Multi-file C project. stats.c imports its declarations from stats.h.
#include "stats.h"
#use "stats.c"

int main(void) {
  int values[6] = {3, 5, 8, 2, 11, 13};
  print_string("sum=");
  print_int(array_sum(values, 6));
  print_char(10);
  print_string("max=");
  print_int(array_max(values, 6));
  print_char(10);
  return 0;
}
