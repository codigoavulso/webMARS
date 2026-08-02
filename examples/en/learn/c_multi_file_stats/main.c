// Multi-file C project. stats.c imports its declarations from stats.h.
#include "stats.h"   // the header declares what exists
#use "stats.c"   // and this line brings in the file that implements it

int main(void) {
  int values[6] = {3, 5, 8, 2, 11, 13};   // the array lives in main's frame
  print_string("sum=");
  print_int(array_sum(values, 6));   // the array is passed as an address, not copied
  print_char(10);
  print_string("max=");
  print_int(array_max(values, 6));   // same array, another function from the same module
  print_char(10);
  return 0;
}
