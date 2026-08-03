//Demo minimal ABI:
//- bingkai tumpukan (lokal di utama/fungsi)
//- alokasi tumpukan melalui alokasi (int)
//- penyampaian argumen ($a0-$a3 + argumen ke-5 pada tumpukan)
//- mengembalikan nilai dalam $v0

int sum5(int a, int b, int c, int d, int e) {
  //Empat argumen pertama menggunakan $a0-$a3; yang kelima dibaca dari tumpukan pemanggil.
  int total = a + b;
  total = total + c;
  total = total + d;
  total = total + e;
  return total;
}

int write_and_double(int* slot, int x, int y) {
  //Penunjuk menulis ke dalam memori heap.
  *slot = x + y;
  //Dereferensi membaca kembali nilai dari memori MIPS yang disimulasikan.
  return *slot * 2;
}

int main(void) {
  int local = 7;                //tumpukan lokal
  int* heap_value = alloc(int); //tumpukan (syscall sbrk)

  //Pointer tetap valid setelah callee kembali karena mengacu pada memori heap.
  int doubled = write_and_double(heap_value, local, 5);
  int combined = sum5(local, 2, 3, 4, *heap_value); //Argumen ke-5 tumpah ruah

  //Hasil yang diharapkan: 52
  print_int(doubled + combined);
  print_char(10);
  return 0;
}
