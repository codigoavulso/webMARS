#use <conio>
#use <string>

int main(void) {
  //Richiede C0-S4- o versione successiva: bool, char, string e la libreria di stringhe.
  char suffix = 'M';   //un carattere è un byte che contiene un codice, qui 77
  string joined = string_join("web", string_fromchar(suffix));   //le stringhe sono costruite nell'heap, non nei registri
  bool matches = string_equal(joined, "webM");   //confrontare il testo significa confrontare byte per byte

  print("Joined string: ");
  print(joined);
  printchar('!');
  printchar('\n');

  print("Matches expected: ");
  printbool(matches);   //un bool è ancora una parola: 0 o 1
  printchar('\n');
  return 0;
}



