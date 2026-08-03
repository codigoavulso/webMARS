#use <conio>
#use <parse>
#use <string>
#use <util>
#use <rand>

int main(void) {
  //Contoh pustaka C0+ lengkap: parse, string, util, dan rand bekerja bersama.
  int* parsed = parse_int("1f", 16);   //parse_int mengembalikan sebuah pointer: null berarti gagal
  rand_t a = init_rand(17);   //benih yang sama memberikan urutan yang sama, yang membuat proses tetap dapat diulang
  rand_t b = init_rand(17);
  string rendered = string_join("hex=", int2hex(*parsed));   //int2hex memformat nomor seperti yang ditunjukkan oleh debugger

  print("Parsed and formatted: ");
  print(rendered);
  printchar('\n');

  print("Token count: ");
  printint(num_tokens("alpha beta gamma"));   //perpustakaan parse membagi teks tanpa pekerjaan penunjuk manual
  printchar('\n');

  print("Deterministic rand: ");
  printbool(rand(a) == rand(b));
  printchar('\n');
  return 0;
}



