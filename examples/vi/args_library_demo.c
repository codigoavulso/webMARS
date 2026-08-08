#use <args>

//Bật Cài đặt > Đối số chương trình được cung cấp cho chương trình MIPS.
//Đối số được đề xuất: -verbose -repeat 3 -name Ada alpha beta
int main(void) {
  bool verbose = false;
  int repeat = 1;
  string name = "MARS";

  //Đăng ký các tùy chọn được đặt tên và địa chỉ nơi lưu trữ các giá trị được phân tích cú pháp.
  args_flag("verbose", &verbose);
  args_int("repeat", &repeat);
  args_string("name", &name);
  //args_parse sử dụng các tùy chọn đã biết và chỉ trả về các đối số vị trí.
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
    //argv là một mảng các chuỗi; mỗi chỉ mục là một mã thông báo chưa được sử dụng.
    print_string(remaining->argv[i]);
    print_char(10);
  }
  return 0;
}
