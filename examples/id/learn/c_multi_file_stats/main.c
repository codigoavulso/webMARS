//Proyek multi-file C. stats.c mengimpor deklarasinya dari stats.h.
#include "stats.h"   //header menyatakan apa yang ada
#use "stats.c"   //dan baris ini membawa file yang mengimplementasikannya

int main(void) {
  int values[6] = {3, 5, 8, 2, 11, 13};   //array berada di frame utama
  print_string("sum=");
  print_int(array_sum(values, 6));   //array diteruskan sebagai alamat, bukan disalin
  print_char(10);
  print_string("max=");
  print_int(array_max(values, 6));   //array yang sama, fungsi lain dari modul yang sama
  print_char(10);
  return 0;
}
