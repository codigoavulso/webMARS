#use <args>

//Aktivieren Sie Einstellungen > Programmargumente, die dem Programm MIPS bereitgestellt werden.
//Vorgeschlagene Argumente: -verbose -repeat 3 -name Ada Alpha Beta
int main(void) {
  bool verbose = false;
  int repeat = 1;
  string name = "MARS";

  //Registrieren Sie benannte Optionen und die Adressen, an denen die geparsten Werte gespeichert werden müssen.
  args_flag("verbose", &verbose);
  args_int("repeat", &repeat);
  args_string("name", &name);
  //args_parse nutzt bekannte Optionen und gibt nur Positionsargumente zurück.
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
    //argv ist ein Array von Strings; Jeder Index ist ein nicht verbrauchter Token.
    print_string(remaining->argv[i]);
    print_char(10);
  }
  return 0;
}
