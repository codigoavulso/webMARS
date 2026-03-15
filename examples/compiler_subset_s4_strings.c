#use <conio>
#use <string>

int main(void) {
  // Requires C0-S4- or higher: bool, char, string, and the string library.
  char suffix = 'M';
  string joined = string_join("web", string_fromchar(suffix));
  bool matches = string_equal(joined, "webM");

  print("Joined string: ");
  print(joined);
  printchar('!');
  printchar('\n');

  print("Matches expected: ");
  printbool(matches);
  printchar('\n');
  return 0;
}



