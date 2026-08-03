#use <conio>
#use <string>

int main(void) {
  //Требуется C0-S4- или выше: bool, char, string и библиотека строк.
  char suffix = 'M';   //символ — это один байт, содержащий код, здесь 77
  string joined = string_join("web", string_fromchar(suffix));   //строки собираются в куче, а не в регистрах
  bool matches = string_equal(joined, "webM");   //сравнение текста означает сравнение побайтно

  print("Joined string: ");
  print(joined);
  printchar('!');
  printchar('\n');

  print("Matches expected: ");
  printbool(matches);   //bool по-прежнему является словом: 0 или 1
  printchar('\n');
  return 0;
}



