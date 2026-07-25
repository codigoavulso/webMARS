#include "stats.h"

int array_sum(int values[], int length) {
  int total = 0;
  for (int i = 0; i < length; i++) {
    total += values[i];
  }
  return total;
}

int array_max(int values[], int length) {
  int result = values[0];
  for (int i = 1; i < length; i++) {
    if (values[i] > result) result = values[i];
  }
  return result;
}
