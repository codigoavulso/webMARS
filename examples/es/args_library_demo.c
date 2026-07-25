#use <args>

// Active Configuracion > Argumentos de programa proporcionados al programa MIPS.
// Argumentos sugeridos: -verbose -repeat 3 -name Ada alfa beta
int main(void) {
  bool verbose = false;
  int repeat = 1;
  string name = "MARS";

  args_flag("verbose", &verbose);
  args_int("repeat", &repeat);
  args_string("name", &name);
  args_t remaining = args_parse();

  if (remaining == NULL) {
    print_string("Lista de argumentos no valida.\n");
    return 0;
  }

  print_string("nombre=");
  print_string(name);
  print_char(10);
  print_string("repeticiones=");
  print_int(repeat);
  print_char(10);
  print_string("verbose=");
  if (verbose) print_string("true\n");
  else print_string("false\n");

  print_string("argumentos posicionales=");
  print_int(remaining->argc);
  print_char(10);
  for (int i = 0; i < remaining->argc; i++) {
    print_string(remaining->argv[i]);
    print_char(10);
  }
  return 0;
}
