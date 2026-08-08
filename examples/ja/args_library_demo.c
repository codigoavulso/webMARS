#use <args>

//MIPS プログラムに提供される [設定] > [プログラム引数] を有効にします。
//推奨される引数: -verbose -repeat 3 -name Ada alpha beta
int main(void) {
  bool verbose = false;
  int repeat = 1;
  string name = "MARS";

  //名前付きオプションと、解析された値を保存する必要があるアドレスを登録します。
  args_flag("verbose", &verbose);
  args_int("repeat", &repeat);
  args_string("name", &name);
  //args_parse は既知のオプションを使用し、位置引数のみを返します。
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
    //argv は文字列の配列です。各インデックスは 1 つの未消費のトークンです。
    print_string(remaining->argv[i]);
    print_char(10);
  }
  return 0;
}
