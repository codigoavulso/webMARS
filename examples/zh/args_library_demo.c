#use <args>

//启用为 MIPS 程序提供的设置 > 程序参数。
//建议的参数：-verbose -repeat 3 -name Ada alpha beta
int main(void) {
  bool verbose = false;
  int repeat = 1;
  string name = "MARS";

  //注册命名选项和必须存储解析值的地址。
  args_flag("verbose", &verbose);
  args_int("repeat", &repeat);
  args_string("name", &name);
  //args_parse 使用已知选项并仅返回位置参数。
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
    //argv 是一个字符串数组；每个索引都是一个未消耗的令牌。
    print_string(remaining->argv[i]);
    print_char(10);
  }
  return 0;
}
