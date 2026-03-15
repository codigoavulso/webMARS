#use <conio>
#use <string>

int main(void) {
  // Requiere C0-S4- o superior: bool, char, string y la libreria string.
  char suffix = 'M';
  string joined = string_join("web", string_fromchar(suffix));
  bool matches = string_equal(joined, "webM");

  print("Cadena unida: ");
  print(joined);
  printchar('!');
  printchar('\n');

  print("Coincide con lo esperado: ");
  printbool(matches);
  printchar('\n');
  return 0;
}



