#include "stats.h"   // the module checks itself against its own declarations

int array_sum(int values[], int length) {   // values arrives as a pointer to the caller's array
  int total = 0;
  for (int i = 0; i < length; i++) {
    total += values[i];   // each index becomes an address computation in MIPS
  }
  return total;
}

int array_max(int values[], int length) {
  int result = values[0];   // start from the first element, then compare the rest
  for (int i = 1; i < length; i++) {
    if (values[i] > result) result = values[i];   // one comparison per element: this loop is linear
  }
  return result;
}
