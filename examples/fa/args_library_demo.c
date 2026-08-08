#use <args>

//تنظیمات > آرگومان های برنامه ارائه شده به برنامه MIPS را فعال کنید.
//آرگومان های پیشنهادی: -کلام - تکرار 3 -نام آدا آلفا بتا
int main(void) {
  bool verbose = false;
  int repeat = 1;
  string name = "MARS";

  //گزینه های نامگذاری شده و آدرس هایی که مقادیر تجزیه شده باید در آنها ذخیره شوند را ثبت کنید.
  args_flag("verbose", &verbose);
  args_int("repeat", &repeat);
  args_string("name", &name);
  //args_parse گزینه های شناخته شده را مصرف می کند و فقط آرگومان های موقعیتی را برمی گرداند.
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
    //argv آرایه ای از رشته ها است. هر شاخص یک توکن مصرف نشده است.
    print_string(remaining->argv[i]);
    print_char(10);
  }
  return 0;
}
