#use <args>

//MIPS প্রোগ্রামে প্রদত্ত সেটিংস > প্রোগ্রাম আর্গুমেন্ট সক্ষম করুন।
//প্রস্তাবিত আর্গুমেন্ট: -ভারবোস -পুনরাবৃত্তি 3 -নাম অ্যাডা আলফা বিটা
int main(void) {
  bool verbose = false;
  int repeat = 1;
  string name = "MARS";

  //নামযুক্ত বিকল্পগুলি এবং ঠিকানাগুলি যেখানে পার্স করা মানগুলি সংরক্ষণ করা আবশ্যক নিবন্ধন করুন৷
  args_flag("verbose", &verbose);
  args_int("repeat", &repeat);
  args_string("name", &name);
  //args_parse পরিচিত বিকল্পগুলি ব্যবহার করে এবং শুধুমাত্র অবস্থানগত আর্গুমেন্ট প্রদান করে।
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
    //argv স্ট্রিং এর একটি অ্যারে; প্রতিটি সূচক একটি অব্যবহৃত টোকেন।
    print_string(remaining->argv[i]);
    print_char(10);
  }
  return 0;
}
