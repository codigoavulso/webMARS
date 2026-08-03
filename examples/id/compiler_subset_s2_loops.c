int main(void) {
  //Membutuhkan C0-S2- atau lebih tinggi: for loop, break/continue, dan ++/--.
  int sum = 0;   //akumulator tinggal di register setelah dikompilasi

  for (int i = 0; i < 10; i++) {   //loop for menjadi perbandingan ditambah cabang mundur
    if ((i % 2) == 0) continue;   //lanjutkan lompatan ke atas, lewati badan
    if (i > 7) break;   //break melompat melewati akhir loop
    sum += i;
  }

  int down = 3;
  down--;   //kompilasi pasca-pengurangan dan pra-kenaikan ke penambahan yang sama
  int up = 3;
  ++up;

  //Keluaran yang diharapkan: 16 2 4
  print_int(sum);
  print_char(32);
  print_int(down);
  print_char(32);
  print_int(up);
  print_char(10);
  return 0;
}
