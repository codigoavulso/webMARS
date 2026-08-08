//@requires \length(row) == 3;
int row_sum(int row[]) {   //parametre bir adrestir: satır kopyalanmaz
  int total = 0;
  for (int i = 0; i < 3; i++) {
    total += row[i];   //satır[i] taban + i*4'e derlenir
  }
  return total;
}

int main(void) {
  //S3 dizileri konusu: yerel diziler, başlatıcı listeleri, çok boyutlu şekiller ve dizi parametreleri.
  int matrix[2][3] = { {1, 2, 3}, {4, 5, 6} };   //hafızada bitişik üç kelimeden oluşan iki satır
  int total = row_sum(matrix[0]) + row_sum(matrix[1]);   //matris[0] ve matris[1] 12 bayt aralıklı adreslerdir

  //Beklenen çıktı: 21
  print_int(total);
  print_char(10);
  return 0;
}
