#use <stdio>

int main(void) {
  //एक पूरी पंक्ति पढ़ें और उसमें से एक पूर्णांक को पार्स करें।
  //C0 लाइब्रेरी द्वारा अपेक्षित परिवर्तनीय इनपुट बफर के रूप में एक int सरणी का उपयोग करता है।
  int line[64];
  int value[1] = {0};

  puts("=== stdio line parse ===");
  puts("Type a line that starts with an integer (example: 42 apples).");
  printf("> ");

  //fgets पढ़े गए बाइट्स की संख्या, या इनपुट के अंत में एक गैर-सकारात्मक मान लौटाता है।
  int len = fgets(line, 64, stdin_fd);
  if (len <= 0) {
    puts("Input ended before a line was read.");
    return 0;
  }

  //sscanf सफलतापूर्वक परिवर्तित फ़ील्ड की संख्या लौटाता है।
  if (sscanf(line, "%d", value) == 1) {
    printf("Parsed integer: ");
    print_int(value[0]);
    print_char(10);
  } else {
    puts("No integer found at line start.");
  }

  //एक अक्षर को दो बार पढ़कर ungetc प्रदर्शित करें।
  puts("Now type one character:");
  int ch = fgetc(stdin_fd);
  if (ch != EOF) {
    //ungetc एक बाइट को पीछे धकेलता है, इसलिए अगला fgetc उसी बाइट को देखता है।
    ungetc(ch, stdin_fd);
    int again = fgetc(stdin_fd);
    printf("Read twice (same code expected): ");
    print_int(ch);
    printf(" / ");
    print_int(again);
    print_char(10);
  }

  return 0;
}
