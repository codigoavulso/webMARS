#use <args>

//설정 > MIPS 프로그램에 제공된 프로그램 인수를 활성화합니다.
//제안된 인수: -verbose -repeat 3 -name Ada alpha beta
int main(void) {
  bool verbose = false;
  int repeat = 1;
  string name = "MARS";

  //명명된 옵션과 구문 분석된 값을 저장해야 하는 주소를 등록합니다.
  args_flag("verbose", &verbose);
  args_int("repeat", &repeat);
  args_string("name", &name);
  //args_parse는 알려진 옵션을 사용하고 위치 인수만 반환합니다.
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
    //argv는 문자열 배열입니다. 각 인덱스는 사용되지 않은 하나의 토큰입니다.
    print_string(remaining->argv[i]);
    print_char(10);
  }
  return 0;
}
