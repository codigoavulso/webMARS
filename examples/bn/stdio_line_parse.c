#use <stdio>

int main(void) {
  //একটি সম্পূর্ণ লাইন পড়ুন এবং এটি থেকে একটি পূর্ণসংখ্যা পার্স করুন।
  //C0 লাইব্রেরি দ্বারা প্রত্যাশিত পরিবর্তনযোগ্য ইনপুট বাফার হিসাবে একটি int অ্যারে ব্যবহার করে।
  int line[64];
  int value[1] = {0};

  puts("=== stdio line parse ===");
  puts("Type a line that starts with an integer (example: 42 apples).");
  printf("> ");

  //fgets পঠিত বাইটের সংখ্যা বা ইনপুটের শেষে একটি অ-পজিটিভ মান প্রদান করে।
  int len = fgets(line, 64, stdin_fd);
  if (len <= 0) {
    puts("Input ended before a line was read.");
    return 0;
  }

  //sscanf সফলভাবে রূপান্তরিত ক্ষেত্রের সংখ্যা প্রদান করে।
  if (sscanf(line, "%d", value) == 1) {
    printf("Parsed integer: ");
    print_int(value[0]);
    print_char(10);
  } else {
    puts("No integer found at line start.");
  }

  //একটি অক্ষর দুবার পড়ে ungetc প্রদর্শন করুন।
  puts("Now type one character:");
  int ch = fgetc(stdin_fd);
  if (ch != EOF) {
    //ungetc একটি বাইট পিছনে ঠেলে দেয়, তাই পরবর্তী fgetc একই বাইট পর্যবেক্ষণ করে।
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
