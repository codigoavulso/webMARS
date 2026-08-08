#use <conio>
#use <string>

int main(void) {
  //Wymaga C0-S4- lub nowszego: bool, char, string i biblioteka string.
  char suffix = 'M';   //znak to jeden bajt zawierający kod, tutaj 77
  string joined = string_join("web", string_fromchar(suffix));   //ciągi znaków są budowane na stercie, a nie w rejestrach
  bool matches = string_equal(joined, "webM");   //porównywanie tekstu oznacza porównywanie bajt po bajcie

  print("Joined string: ");
  print(joined);
  printchar('!');
  printchar('\n');

  print("Matches expected: ");
  printbool(matches);   //bool jest nadal słowem: 0 lub 1
  printchar('\n');
  return 0;
}



