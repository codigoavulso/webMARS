#use <conio>
#use <string>

int main(void) {
  // Requer C0-S4- ou superior: bool, char, string e a biblioteca string.
  char suffix = 'M';
  string joined = string_join("web", string_fromchar(suffix));
  bool matches = string_equal(joined, "webM");

  print("String combinada: ");
  print(joined);
  printchar('!');
  printchar('\n');

  print("Corresponde ao esperado: ");
  printbool(matches);
  printchar('\n');
  return 0;
}



