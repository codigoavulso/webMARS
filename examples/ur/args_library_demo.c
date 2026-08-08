#use <args>

//MIPS پروگرام کو فراہم کردہ ترتیبات > پروگرام کے دلائل کو فعال کریں۔
//تجویز کردہ دلائل: -verbose -repeat 3 -name Ada alpha beta
int main(void) {
  bool verbose = false;
  int repeat = 1;
  string name = "MARS";

  //نامزد کردہ اختیارات اور ان پتے کو رجسٹر کریں جہاں تجزیہ شدہ اقدار کو ذخیرہ کرنا ضروری ہے۔
  args_flag("verbose", &verbose);
  args_int("repeat", &repeat);
  args_string("name", &name);
  //args_parse معلوم اختیارات استعمال کرتا ہے اور صرف پوزیشنی دلائل دیتا ہے۔
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
    //argv تاروں کی ایک صف ہے۔ ہر انڈیکس ایک غیر استعمال شدہ ٹوکن ہے۔
    print_string(remaining->argv[i]);
    print_char(10);
  }
  return 0;
}
