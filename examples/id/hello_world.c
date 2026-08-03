//C0-S1 contoh: keluaran string dan pengembalian normal dari utama.
//Kompiler menurunkan pembantu ini ke syscall cetak MIPS yang sama yang digunakan oleh Majelis.
int main(void) {
  //Literal string dipancarkan di segmen data dengan byte nol di belakangnya.
  print_string("Hello from C on webMARS!");
  //ASCII 10 adalah umpan baris; print_char memancarkan tepat satu karakter.
  print_char(10);
  //Kembali dari main menjadi jalan keluar program yang bersih.
  return 0;
}
