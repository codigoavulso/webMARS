#use <args>

//Aktifkan Pengaturan > Argumen program disediakan untuk program MIPS.
//Argumen yang disarankan: -verbose -ulangi 3 -nama Ada alpha beta
int main(void) {
  bool verbose = false;
  int repeat = 1;
  string name = "MARS";

  //Daftarkan opsi bernama dan alamat tempat nilai yang diurai harus disimpan.
  args_flag("verbose", &verbose);
  args_int("repeat", &repeat);
  args_string("name", &name);
  //args_parse menggunakan opsi yang diketahui dan hanya mengembalikan argumen posisi.
  args_t remaining = args_parse();

  if (remaining == NULL) {
    print_string("Invalid argument list.\n");
    return 0;
  }

  print_string("name=");
  print_string(name);
  print_char(10);
  print_string("repeat=");
  print_int(repeat);
  print_char(10);
  print_string("verbose=");
  if (verbose) print_string("true\n");
  else print_string("false\n");

  print_string("positional arguments=");
  print_int(remaining->argc);
  print_char(10);
  for (int i = 0; i < remaining->argc; i++) {
    //argv adalah array string; setiap indeks adalah satu token yang tidak dikonsumsi.
    print_string(remaining->argv[i]);
    print_char(10);
  }
  return 0;
}
