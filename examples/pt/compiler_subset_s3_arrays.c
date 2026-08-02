//@requires \length(row) == 3;
int row_sum(int row[]) {   // o parâmetro é um endereço: a linha não é copiada
  int total = 0;
  for (int i = 0; i < 3; i++) {
    total += row[i];   // row[i] compila para base + i*4
  }
  return total;
}

int main(void) {
  // Tema de arrays S3: arrays locais, listas de inicializacao, shapes multidimensionais e parametros array.
  int matrix[2][3] = { {1, 2, 3}, {4, 5, 6} };   // duas linhas de três palavras, contíguas em memória
  int total = row_sum(matrix[0]) + row_sum(matrix[1]);   // matrix[0] e matrix[1] são endereços a 12 bytes de distância

  // Saida esperada: 21
  print_int(total);
  print_char(10);
  return 0;
}
