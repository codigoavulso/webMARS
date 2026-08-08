#use <args>

//Abilita Impostazioni > Argomenti del programma forniti al programma MIPS.
//Argomenti suggeriti: -verbose -repeat 3 -name Ada alpha beta
int main(void) {
  bool verbose = false;
  int repeat = 1;
  string name = "MARS";

  //Registra le opzioni denominate e gli indirizzi in cui devono essere archiviati i valori analizzati.
  args_flag("verbose", &verbose);
  args_int("repeat", &repeat);
  args_string("name", &name);
  //args_parse consuma opzioni conosciute e restituisce solo argomenti posizionali.
  args_t remaining = args_parse();

  if (remaining == NULL) {
    print_string("Invalid argument list.\n");
    return 0;
  }

  print_string("name=");
  print_string(name);
  print_char(10);
  print_string("repeat=");
  print_int(repeat);
  print_char(10);
  print_string("verbose=");
  if (verbose) print_string("true\n");
  else print_string("false\n");

  print_string("positional arguments=");
  print_int(remaining->argc);
  print_char(10);
  for (int i = 0; i < remaining->argc; i++) {
    //argv è un array di stringhe; ogni indice è un token non consumato.
    print_string(remaining->argv[i]);
    print_char(10);
  }
  return 0;
}
