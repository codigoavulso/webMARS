#use <stdio>

int main(void) {
  //读取一整行并从中解析一个整数。
  //C0 使用 int 数组作为库期望的可变输入缓冲区。
  int line[64];
  int value[1] = {0};

  puts("=== stdio line parse ===");
  puts("Type a line that starts with an integer (example: 42 apples).");
  printf("> ");

  //fgets 返回读取的字节数，或输入末尾的非正值。
  int len = fgets(line, 64, stdin_fd);
  if (len <= 0) {
    puts("Input ended before a line was read.");
    return 0;
  }

  //sscanf 返回成功转换的字段数。
  if (sscanf(line, "%d", value) == 1) {
    printf("Parsed integer: ");
    print_int(value[0]);
    print_char(10);
  } else {
    puts("No integer found at line start.");
  }

  //通过读取一个字符两次来演示 ungetc。
  puts("Now type one character:");
  int ch = fgetc(stdin_fd);
  if (ch != EOF) {
    //ungetc 推回一个字节，因此下一个 fgetc 观察到相同的字节。
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
