//@requires \length(row) == 3;
int row_sum(int row[]) {   //parameternya adalah alamat: baris tidak disalin
  int total = 0;
  for (int i = 0; i < 3; i++) {
    total += row[i];   //baris[i] dikompilasi ke basis + i*4
  }
  return total;
}

int main(void) {
  //Topik array S3: array lokal, daftar penginisialisasi, bentuk multidimensi, dan parameter array.
  int matrix[2][3] = { {1, 2, 3}, {4, 5, 6} };   //dua baris tiga kata, bersebelahan dalam memori
  int total = row_sum(matrix[0]) + row_sum(matrix[1]);   //matriks[0] dan matriks[1] adalah alamat yang terpisah 12 byte

  //Hasil yang diharapkan: 21
  print_int(total);
  print_char(10);
  return 0;
}
