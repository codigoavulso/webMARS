//@requires \length(row) == 3;
int row_sum(int row[]) {   // el parámetro es una dirección: la fila no se copia
  int total = 0;
  for (int i = 0; i < 3; i++) {
    total += row[i];   // row[i] compila a base + i*4
  }
  return total;
}

int main(void) {
  // Tema de arrays S3: arrays locales, listas de inicializacion, shapes multidimensionales y parametros array.
  int matrix[2][3] = { {1, 2, 3}, {4, 5, 6} };   // dos filas de tres palabras, contiguas en memoria
  int total = row_sum(matrix[0]) + row_sum(matrix[1]);   // matrix[0] y matrix[1] son direcciones a 12 bytes de distancia

  // Salida esperada: 21
  print_int(total);
  print_char(10);
  return 0;
}
