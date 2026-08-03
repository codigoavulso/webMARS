#use <args>

//MIPS प्रोग्राम को दिए गए सेटिंग्स > प्रोग्राम तर्क सक्षम करें।
//सुझाए गए तर्क: -वर्बोज़ -दोहराएँ 3 -नाम एडा अल्फा बीटा
int main(void) {
  bool verbose = false;
  int repeat = 1;
  string name = "MARS";

  //नामित विकल्प और पते पंजीकृत करें जहां पार्स किए गए मान संग्रहीत किए जाने चाहिए।
  args_flag("verbose", &verbose);
  args_int("repeat", &repeat);
  args_string("name", &name);
  //args_parse ज्ञात विकल्पों का उपभोग करता है और केवल स्थितीय तर्क लौटाता है।
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
    //argv स्ट्रिंग्स की एक सरणी है; प्रत्येक सूचकांक एक अप्रयुक्त टोकन है।
    print_string(remaining->argv[i]);
    print_char(10);
  }
  return 0;
}
