//@requires \length(row) == 3;
int row_sum(int row[]) {   //il parametro è un indirizzo: la riga non viene copiata
  int total = 0;
  for (int i = 0; i < 3; i++) {
    total += row[i];   //row[i] compila in base + i*4
  }
  return total;
}

int main(void) {
  //Argomento sugli array S3: array locali, elenchi di inizializzatori, forme multidimensionali e parametri di array.
  int matrix[2][3] = { {1, 2, 3}, {4, 5, 6} };   //due file di tre parole, contigue in memoria
  int total = row_sum(matrix[0]) + row_sum(matrix[1]);   //matrice[0] e matrice[1] sono indirizzi distanti 12 byte

  //Produzione prevista: 21
  print_int(total);
  print_char(10);
  return 0;
}
