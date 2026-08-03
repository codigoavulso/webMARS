#use <conio>
#use <string>

int main(void) {
  //Nécessite C0-S4- ou supérieur : bool, char, string et la bibliothèque de chaînes.
  char suffix = 'M';   //un caractère est un octet contenant un code, ici 77
  string joined = string_join("web", string_fromchar(suffix));   //les chaînes sont construites dans le tas, pas dans les registres
  bool matches = string_equal(joined, "webM");   //comparer du texte signifie comparer octet par octet

  print("Joined string: ");
  print(joined);
  printchar('!');
  printchar('\n');

  print("Matches expected: ");
  printbool(matches);   //un booléen est toujours un mot : 0 ou 1
  printchar('\n');
  return 0;
}



