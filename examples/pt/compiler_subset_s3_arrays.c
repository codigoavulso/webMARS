//@requires \length(row) == 3;
int row_sum(int row[]) {   // o parâmetro é um endereço: a linha não é copiada
  int total = 0;
  for (int i = 0; i < 3; i++) {
    total += row[i];   // row[i] compila para base + i*4
  }
  return total;
}

int main(void) {
  // Um vetor de 2 por 3 é guardado linha a linha. Ao passar uma linha à função, passa-se o seu endereço.
  int matrix[2][3] = { {1, 2, 3}, {4, 5, 6} };   // duas linhas de três palavras, contíguas em memória
  int total = row_sum(matrix[0]) + row_sum(matrix[1]);   // matrix[0] e matrix[1] são endereços a 12 bytes de distância

  // Saida esperada: 21
  print_int(total);
  print_char(10);
  return 0;
}
