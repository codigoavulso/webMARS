//@requires \length(row) == 3;
int row_sum(int row[]) {
  int total = 0;
  for (int i = 0; i < 3; i++) {
    total += row[i];
  }
  return total;
}

int main(void) {
  // Requires C0-S3- or higher: local arrays, init lists, multidimensional shapes, and array parameters.
  int matrix[2][3] = { {1, 2, 3}, {4, 5, 6} };
  int total = row_sum(matrix[0]) + row_sum(matrix[1]);

  // Expected output: 21
  print_int(total);
  print_char(10);
  return 0;
}
