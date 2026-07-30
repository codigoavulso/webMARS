#use <args>

// Ative Definicoes > Argumentos de programa fornecidos ao programa MIPS.
// Argumentos sugeridos: -verbose -repeat 3 -name Ada alfa beta
int main(void) {
  bool verbose = false;
  int repeat = 1;
  string name = "MARS";

  // Estas funções registam as opções e os endereços onde guardar os valores.
  args_flag("verbose", &verbose);
  args_int("repeat", &repeat);
  args_string("name", &name);
  // args_parse consome as opções conhecidas e conserva os argumentos posicionais.
  args_t remaining = args_parse();

  if (remaining == NULL) {
    print_string("Lista de argumentos invalida.\n");
    return 0;
  }

  // remaining->argc/argv descrevem apenas os argumentos que não eram opções.
  print_string("nome=");
  print_string(name);
  print_char(10);
  print_string("repeticoes=");
  print_int(repeat);
  print_char(10);
  print_string("verbose=");
  if (verbose) print_string("true\n");
  else print_string("false\n");

  print_string("argumentos posicionais=");
  print_int(remaining->argc);
  print_char(10);
  for (int i = 0; i < remaining->argc; i++) {
    print_string(remaining->argv[i]);
    print_char(10);
  }
  return 0;
}
