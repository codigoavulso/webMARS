#use <conio>
#use <parse>
#use <string>
#use <util>
#use <rand>

int main(void) {
  // Exemplo de C0 completo + bibliotecas: parse, string, util e rand a trabalhar em conjunto.
  int* parsed = parse_int("1f", 16);   // parse_int devolve um apontador: nulo significa falha
  rand_t a = init_rand(17);   // a mesma semente dá a mesma sequência, o que torna a execução repetível
  rand_t b = init_rand(17);
  string rendered = string_join("hex=", int2hex(*parsed));   // int2hex formata o número como o depurador o mostra

  print("Parse e formato: ");
  print(rendered);
  printchar('\n');

  print("Numero de tokens: ");
  printint(num_tokens("alpha beta gamma"));   // a biblioteca parse divide texto sem manipular apontadores à mão
  printchar('\n');

  print("Rand deterministico: ");
  printbool(rand(a) == rand(b));
  printchar('\n');
  return 0;
}



