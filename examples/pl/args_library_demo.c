#use <args>

//Włącz Ustawienia > Argumenty programu dostarczone do programu MIPS.
//Sugerowane argumenty: -verbose -repeat 3 -name Ada alfa beta
int main(void) {
  bool verbose = false;
  int repeat = 1;
  string name = "MARS";

  //Zarejestruj nazwane opcje i adresy, pod którymi muszą być przechowywane przeanalizowane wartości.
  args_flag("verbose", &verbose);
  args_int("repeat", &repeat);
  args_string("name", &name);
  //args_parse wykorzystuje znane opcje i zwraca tylko argumenty pozycyjne.
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
    //argv jest tablicą ciągów; każdy indeks to jeden niewykorzystany token.
    print_string(remaining->argv[i]);
    print_char(10);
  }
  return 0;
}
