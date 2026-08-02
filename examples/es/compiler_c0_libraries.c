#use <conio>
#use <parse>
#use <string>
#use <util>
#use <rand>

int main(void) {
  // Ejemplo de C0 completo + librerias: parse, string, util y rand trabajando juntos.
  int* parsed = parse_int("1f", 16);   // parse_int devuelve un puntero: nulo significa fallo
  rand_t a = init_rand(17);   // la misma semilla da la misma secuencia, lo que hace repetible la ejecución
  rand_t b = init_rand(17);
  string rendered = string_join("hex=", int2hex(*parsed));   // int2hex formatea el número como lo muestra el depurador

  print("Parseo y formato: ");
  print(rendered);
  printchar('\n');

  print("Numero de tokens: ");
  printint(num_tokens("alpha beta gamma"));   // la biblioteca parse divide texto sin manejar punteros a mano
  printchar('\n');

  print("Rand deterministico: ");
  printbool(rand(a) == rand(b));
  printchar('\n');
  return 0;
}



