#use <conio>
#use <string>

int main(void) {
  //C0-S4- veya üzerini gerektirir: bool, char, string ve string kitaplığı.
  char suffix = 'M';   //karakter bir kodu tutan bir bayttır, burada 77
  string joined = string_join("web", string_fromchar(suffix));   //dizeler kayıtlarda değil yığında oluşturulur
  bool matches = string_equal(joined, "webM");   //metni karşılaştırmak bayt bayt karşılaştırmak anlamına gelir

  print("Joined string: ");
  print(joined);
  printchar('!');
  printchar('\n');

  print("Matches expected: ");
  printbool(matches);   //bool hala bir kelimedir: 0 veya 1
  printchar('\n');
  return 0;
}



