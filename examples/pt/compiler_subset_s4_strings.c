#use <conio>
#use <string>

int main(void) {
  // Requer C0-S4- ou superior: bool, char, string e a biblioteca string.
  char suffix = 'M';   // um char é um byte com um código, aqui 77
  string joined = string_join("web", string_fromchar(suffix));   // as cadeias são construídas na heap, não em registos
  bool matches = string_equal(joined, "webM");   // comparar texto é comparar byte a byte

  print("String combinada: ");
  print(joined);
  printchar('!');
  printchar('\n');

  print("Corresponde ao esperado: ");
  printbool(matches);   // um bool continua a ser uma palavra: 0 ou 1
  printchar('\n');
  return 0;
}



