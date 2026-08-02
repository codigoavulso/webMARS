#use <conio>
#use <parse>
#use <string>
#use <util>
#use <rand>

int main(void) {
  // Full C0 + libraries example: parse, string, util, and rand working together.
  int* parsed = parse_int("1f", 16);   // parse_int returns a pointer: null means it failed
  rand_t a = init_rand(17);   // the same seed gives the same sequence, which keeps runs repeatable
  rand_t b = init_rand(17);
  string rendered = string_join("hex=", int2hex(*parsed));   // int2hex formats the number the way the debugger shows it

  print("Parsed and formatted: ");
  print(rendered);
  printchar('\n');

  print("Token count: ");
  printint(num_tokens("alpha beta gamma"));   // the parse library splits text without manual pointer work
  printchar('\n');

  print("Deterministic rand: ");
  printbool(rand(a) == rand(b));
  printchar('\n');
  return 0;
}



