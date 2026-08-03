#use <conio>
#use <string>

int main(void) {
  //Membutuhkan C0-S4- atau lebih tinggi: bool, char, string, dan pustaka string.
  char suffix = 'M';   //char adalah satu byte yang menyimpan kode, di sini 77
  string joined = string_join("web", string_fromchar(suffix));   //string dibuat di heap, bukan di register
  bool matches = string_equal(joined, "webM");   //membandingkan teks berarti membandingkan byte demi byte

  print("Joined string: ");
  print(joined);
  printchar('!');
  printchar('\n');

  print("Matches expected: ");
  printbool(matches);   //bool tetaplah sebuah kata: 0 atau 1
  printchar('\n');
  return 0;
}



