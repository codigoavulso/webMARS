#use <args>

//Включите Настройки > Аргументы программы, предоставленные программе MIPS.
//Предлагаемые аргументы: -verbose -repeat 3 -name Ada Alpha Beta
int main(void) {
  bool verbose = false;
  int repeat = 1;
  string name = "MARS";

  //Зарегистрируйте именованные параметры и адреса, по которым должны храниться проанализированные значения.
  args_flag("verbose", &verbose);
  args_int("repeat", &repeat);
  args_string("name", &name);
  //args_parse использует известные параметры и возвращает только позиционные аргументы.
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
    //argv — массив строк; каждый индекс представляет собой один неизрасходованный токен.
    print_string(remaining->argv[i]);
    print_char(10);
  }
  return 0;
}
