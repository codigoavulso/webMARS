#use <conio>
#use <string>

int main(void) {
  // Requires C0-S4- or higher: bool, char, string, and the string library.
  char suffix = 'M';   // a char is one byte holding a code, here 77
  string joined = string_join("web", string_fromchar(suffix));   // strings are built in the heap, not in registers
  bool matches = string_equal(joined, "webM");   // comparing text means comparing byte by byte

  print("Joined string: ");
  print(joined);
  printchar('!');
  printchar('\n');

  print("Matches expected: ");
  printbool(matches);   // a bool is still a word: 0 or 1
  printchar('\n');
  return 0;
}



