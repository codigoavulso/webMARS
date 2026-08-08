#use <conio>
#use <string>

int main(void) {
  //Erfordert C0-S4- oder höher: bool, char, string und die String-Bibliothek.
  char suffix = 'M';   //Ein Zeichen ist ein Byte, das einen Code enthält, hier 77
  string joined = string_join("web", string_fromchar(suffix));   //Zeichenfolgen werden im Heap erstellt, nicht in Registern
  bool matches = string_equal(joined, "webM");   //Text zu vergleichen bedeutet, Byte für Byte zu vergleichen

  print("Joined string: ");
  print(joined);
  printchar('!');
  printchar('\n');

  print("Matches expected: ");
  printbool(matches);   //Ein Bool ist immer noch ein Wort: 0 oder 1
  printchar('\n');
  return 0;
}



