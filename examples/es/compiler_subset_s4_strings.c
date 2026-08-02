#use <conio>
#use <string>

int main(void) {
  // Requiere C0-S4- o superior: bool, char, string y la libreria string.
  char suffix = 'M';   // un char es un byte con un código, aquí 77
  string joined = string_join("web", string_fromchar(suffix));   // las cadenas se construyen en el heap, no en registros
  bool matches = string_equal(joined, "webM");   // comparar texto es comparar byte a byte

  print("Cadena unida: ");
  print(joined);
  printchar('!');
  printchar('\n');

  print("Coincide con lo esperado: ");
  printbool(matches);   // un bool sigue siendo una palabra: 0 o 1
  printchar('\n');
  return 0;
}



