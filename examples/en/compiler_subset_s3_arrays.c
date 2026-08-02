//@requires \length(row) == 3;
int row_sum(int row[]) {   // the parameter is an address: the row is not copied
  int total = 0;
  for (int i = 0; i < 3; i++) {
    total += row[i];   // row[i] compiles to base + i*4
  }
  return total;
}

int main(void) {
  // S3 arrays topic: local arrays, initializer lists, multidimensional shapes, and array parameters.
  int matrix[2][3] = { {1, 2, 3}, {4, 5, 6} };   // two rows of three words, contiguous in memory
  int total = row_sum(matrix[0]) + row_sum(matrix[1]);   // matrix[0] and matrix[1] are addresses 12 bytes apart

  // Expected output: 21
  print_int(total);
  print_char(10);
  return 0;
}
