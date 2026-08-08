//@requires \length(row) == 3;
int row_sum(int row[]) {   //parametrem jest adres: wiersz nie jest kopiowany
  int total = 0;
  for (int i = 0; i < 3; i++) {
    total += row[i];   //row[i] kompiluje do bazy + i*4
  }
  return total;
}

int main(void) {
  //Temat tablic S3: tablice lokalne, listy inicjatorów, kształty wielowymiarowe i parametry tablic.
  int matrix[2][3] = { {1, 2, 3}, {4, 5, 6} };   //dwa rzędy po trzy słowa sąsiadujące ze sobą w pamięci
  int total = row_sum(matrix[0]) + row_sum(matrix[1]);   //matrix[0] i matrix[1] mają adresy oddalone od siebie o 12 bajtów

  //Oczekiwana produkcja: 21
  print_int(total);
  print_char(10);
  return 0;
}
