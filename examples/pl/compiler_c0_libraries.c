#use <conio>
#use <parse>
#use <string>
#use <util>
#use <rand>

int main(void) {
  //Pełny przykład bibliotek C0 +: parse, string, util i rand współpracujące ze sobą.
  int* parsed = parse_int("1f", 16);   //parse_int zwraca wskaźnik: null oznacza, że nie powiodło się
  rand_t a = init_rand(17);   //to samo ziarno daje tę samą sekwencję, dzięki czemu przebiegi są powtarzalne
  rand_t b = init_rand(17);
  string rendered = string_join("hex=", int2hex(*parsed));   //int2hex formatuje liczbę w sposób, w jaki pokazuje ją debuger

  print("Parsed and formatted: ");
  print(rendered);
  printchar('\n');

  print("Token count: ");
  printint(num_tokens("alpha beta gamma"));   //biblioteka parse dzieli tekst bez ręcznej pracy ze wskaźnikiem
  printchar('\n');

  print("Deterministic rand: ");
  printbool(rand(a) == rand(b));
  printchar('\n');
  return 0;
}



