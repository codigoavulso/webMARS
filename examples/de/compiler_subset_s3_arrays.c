//@requires \length(row) == 3;
int row_sum(int row[]) {   //Der Parameter ist eine Adresse: Die Zeile wird nicht kopiert
  int total = 0;
  for (int i = 0; i < 3; i++) {
    total += row[i];   //row[i] wird zur Basis + i*4 kompiliert
  }
  return total;
}

int main(void) {
  //Thema S3-Arrays: lokale Arrays, Initialisierungslisten, mehrdimensionale Formen und Array-Parameter.
  int matrix[2][3] = { {1, 2, 3}, {4, 5, 6} };   //zwei Reihen mit drei Wörtern, die im Gedächtnis zusammenhängend sind
  int total = row_sum(matrix[0]) + row_sum(matrix[1]);   //Matrix[0] und Matrix[1] sind Adressen im Abstand von 12 Bytes

  //Erwartete Ausgabe: 21
  print_int(total);
  print_char(10);
  return 0;
}
