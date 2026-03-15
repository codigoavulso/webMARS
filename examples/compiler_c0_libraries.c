#use <conio>
#use <parse>
#use <string>
#use <util>
#use <rand>

int main(void) {
  // Full C0 + libraries example: parse, string, util, and rand working together.
  int* parsed = parse_int("1f", 16);
  rand_t a = init_rand(17);
  rand_t b = init_rand(17);
  string rendered = string_join("hex=", int2hex(*parsed));

  print("Parsed and formatted: ");
  print(rendered);
  printchar('\n');

  print("Token count: ");
  printint(num_tokens("alpha beta gamma"));
  printchar('\n');

  print("Deterministic rand: ");
  printbool(rand(a) == rand(b));
  printchar('\n');
  return 0;
}



