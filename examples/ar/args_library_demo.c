#use <args>

//قم بتمكين الإعدادات > وسيطات البرنامج المتوفرة لبرنامج MIPS.
//الوسائط المقترحة: - مطول - كرر 3 - اسم Ada alpha beta
int main(void) {
  bool verbose = false;
  int repeat = 1;
  string name = "MARS";

  //قم بتسجيل الخيارات المسماة والعناوين التي يجب تخزين القيم التي تم تحليلها فيها.
  args_flag("verbose", &verbose);
  args_int("repeat", &repeat);
  args_string("name", &name);
  //يستهلك args_parse الخيارات المعروفة ويعيد الوسائط الموضعية فقط.
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
    //argv عبارة عن مجموعة من السلاسل؛ كل فهرس هو رمز واحد غير مستهلك.
    print_string(remaining->argv[i]);
    print_char(10);
  }
  return 0;
}
